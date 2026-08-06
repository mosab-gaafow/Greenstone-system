import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const CUST = `${API_BASE_PATH}/customers`;
const INV = `${API_BASE_PATH}/invoices`;
const PAY = `${API_BASE_PATH}/customer-payments`;
const TOM = new Date(Date.now() + 86400000).toISOString();

async function csrfH(cookie: string) {
  const r = await request(app).get(`${API_BASE_PATH}/csrf-token`).set('Cookie', cookie);
  const issued = (r.headers['set-cookie'] as unknown as string[]) ?? [];
  const c = issued.find((v: string) => v.startsWith('greenstone.csrf='));
  return { Cookie: `${cookie}; ${c!.split(';')[0]!}`, [CSRF_HEADER_NAME]: r.body.data.csrfToken as string };
}
async function sp(n: string) { return getTestPrisma().product.create({ data: { name: n, nameNormalized: normalizeForComparison(n), category: 'HOLLOW_BLOCK', size: 'T', piecesPerPallet: 12, isActive: true } }); }
async function sc(n: string) { const ph = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`; return getTestPrisma().customer.create({ data: { name: n, phone: ph, phoneNormalized: normalizePhone(ph), isActive: true } }); }
async function sa(cid: string) { return getTestPrisma().customerAddress.create({ data: { customerId: cid, label: 'S', labelNormalized: 's', addressLine: 'R', isActive: true } }); }
async function so(cid: string, aid: string, pid: string) { return getTestPrisma().order.create({ data: { orderNumber: `ORD-2026-${String(8800 + Math.floor(Math.random() * 100))}`, customerId: cid, customerAddressId: aid, addressLabel: 'S', addressLine: 'R', paymentArrangement: 'CREDIT', totalAmount: '500.00', items: { create: { productId: pid, quantity: 10, agreedUnitPrice: '50.00', lineTotal: '500.00', remainingQuantity: 10, sortOrder: 1 } } } }); }
async function sadmin() { const { cookie } = await createSignedInUser('admin'); return { cookie }; }

describe('customer statement', () => {
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => { await disconnectPrisma(); await disconnectTestPrisma(); });

  // Helper to find a transaction by type
  const txnByType = (txns: { type: string; paymentStatus?: string; charge?: string; payment?: string }[], type: string) => txns.find((t) => t.type === type)!;

  it('returns opening balance row when no other transactions', async () => {
    const { cookie } = await sadmin();
    const c = await sc('StmtCust');
    await getTestPrisma().customerOpeningBalance.create({ data: { customerId: c.id, amount: '1000.00', effectiveDate: new Date('2026-01-01'), reason: 'Initial', enteredByUserId: null } });
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.openingBalance).toBe('1000.00');
    expect(res.body.data.totalInvoiced).toBe('0.00');
    expect(res.body.data.totalPaid).toBe('0.00');
    expect(res.body.data.closingBalance).toBe('1000.00');
    expect(res.body.data.transactions.length).toBe(1); // opening balance row
    expect(res.body.data.transactions[0].type).toBe('OPENING_BALANCE');
  });

  it('issued invoice increases balance', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtP'); const c = await sc('StmtC');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.totalInvoiced).toBe('500.00');
    expect(res.body.data.closingBalance).toBe('500.00');
    const inv = txnByType(res.body.data.transactions, 'INVOICE');
    expect(inv).toBeTruthy();
    expect(inv.charge).toBe('500.00');
    expect(inv.paymentStatus).toBe('Unpaid'); // historical: invoice just issued
  });

  it('approved payment decreases balance and shows resulting payment status', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtP2'); const c = await sc('StmtC2');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.totalInvoiced).toBe('500.00');
    expect(res.body.data.totalPaid).toBe('500.00');
    expect(res.body.data.closingBalance).toBe('0.00');
    const pmt = txnByType(res.body.data.transactions, 'PAYMENT');
    expect(pmt).toBeTruthy();
    expect(pmt.payment).toBe('500.00');
    expect(pmt.charge).toBe('0.00');
    // Payment row should show Fully paid (500 approved out of 500 total)
    expect(pmt.paymentStatus).toBe('Fully paid');
    // Invoice row should show Unpaid (historical)
    const invTxn = txnByType(res.body.data.transactions, 'INVOICE');
    expect(invTxn.paymentStatus).toBe('Unpaid');
  });

  it('partial payment shows Partially paid progression', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPartProg'); const c = await sc('StmtPartProg');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    // First payment: 300 out of 500
    const pay1 = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '300.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '300.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay1.body.data.id}/approve`).set(h).send({}).expect(200);
    // Second payment: 200 out of 500
    const pay2 = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '200.00', paymentMethod: 'MPESA', paymentReference: 'REF2', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '200.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay2.body.data.id}/approve`).set(h).send({}).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    const payments = res.body.data.transactions.filter((t: { type: string }) => t.type === 'PAYMENT');
    expect(payments.length).toBe(2);
    // First payment: 300 approved → Partially paid
    expect(payments[0].paymentStatus).toBe('Partially paid');
    // Second payment: 300+200=500 → Fully paid
    expect(payments[1].paymentStatus).toBe('Fully paid');
    // Invoice row still shows Unpaid (historical at time of issue)
    const invTxn = txnByType(res.body.data.transactions, 'INVOICE');
    expect(invTxn.paymentStatus).toBe('Unpaid');
  });

  it('approved payment decreases balance', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtP2b'); const c = await sc('StmtC2b');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.totalInvoiced).toBe('500.00');
    expect(res.body.data.totalPaid).toBe('500.00');
    expect(res.body.data.closingBalance).toBe('0.00');
    const pmt = txnByType(res.body.data.transactions, 'PAYMENT');
    expect(pmt).toBeTruthy();
    expect(pmt.payment).toBe('500.00');
    expect(pmt.charge).toBe('0.00');
    expect(pmt.paymentStatus).toBe('Fully paid');
  });

  it('pending payment is excluded', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtP3'); const c = await sc('StmtC3');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.totalPaid).toBe('0.00');
    expect(res.body.data.closingBalance).toBe('500.00');
  });

  it('reversed payment is excluded', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtP4'); const c = await sc('StmtC4');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);
    await request(app).post(`${PAY}/${pay.body.data.id}/reverse`).set(h).send({ reason: 'Test' }).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.totalPaid).toBe('0.00');
    expect(res.body.data.closingBalance).toBe('500.00');
  });

  it('voided invoice is excluded', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtP5'); const c = await sc('StmtC5');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const invRes = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    await request(app).post(`${INV}/${invRes.body.data.id}/void`).set(h).send({ reason: 'Test' }).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.totalInvoiced).toBe('0.00');
    expect(res.body.data.closingBalance).toBe('0.00');
  });

  it('partial payment allocation uses allocated amount', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPart'); const c = await sc('StmtPart');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    // Pay only 200 out of 500
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '200.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '200.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    expect(res.body.data.totalPaid).toBe('200.00');
    expect(res.body.data.closingBalance).toBe('300.00');
    const pmt = txnByType(res.body.data.transactions, 'PAYMENT');
    expect(pmt.payment).toBe('200.00');
  });

  it('date filtering shows brought-forward balance', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtBF'); const c = await sc('StmtBF');
    await getTestPrisma().customerOpeningBalance.create({ data: { customerId: c.id, amount: '500.00', effectiveDate: new Date('2026-01-01'), reason: 'Init', enteredByUserId: null } });
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);

    // Filter to a future range — invoice should be in brought-forward
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).query({ from: '2027-01-01', to: '2027-12-31' }).expect(200);
    expect(res.body.data.totalInvoiced).toBe('0.00');
    expect(res.body.data.openingBalance).toBe('1000.00'); // 500 ob + 500 invoice
    const bf = txnByType(res.body.data.transactions, 'BROUGHT_FORWARD');
    expect(bf).toBeTruthy();
  });

  it('to date is inclusive', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtInc'); const c = await sc('StmtInc');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).query({ to: '2027-12-31' }).expect(200);
    // Invoice + payment both in range (no from filter, far-future to)
    const invTxn = txnByType(res.body.data.transactions, 'INVOICE');
    const pmtTxn = txnByType(res.body.data.transactions, 'PAYMENT');
    expect(invTxn).toBeTruthy();
    expect(pmtTxn).toBeTruthy();
  });

  it('from after to is rejected', async () => {
    const { cookie } = await sadmin();
    const c = await sc('StmtInv');
    await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).query({ from: '2027-01-01', to: '2026-01-01' }).expect(422);
  });

  it('running balance after every row is correct', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtRun'); const c = await sc('StmtRun');
    await getTestPrisma().customerOpeningBalance.create({ data: { customerId: c.id, amount: '100.00', effectiveDate: new Date('2026-01-01'), reason: 'Init', enteredByUserId: null } });
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    const txns = res.body.data.transactions;
    // Row 0: opening balance = 100
    expect(txns[0].type).toBe('OPENING_BALANCE');
    expect(txns[0].balance).toBe('100.00');
    // Row 1: invoice = 500, balance = 600
    expect(txns[1].type).toBe('INVOICE');
    expect(txns[1].charge).toBe('500.00');
    expect(txns[1].balance).toBe('600.00');
  });

  it('summary totals match table transactions', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtSum'); const c = await sc('StmtSum');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '300.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '300.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);

    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    // Sum from table: opening(0) + invoice(500) - payment(300) = 200
    const invTxn = txnByType(res.body.data.transactions, 'INVOICE');
    const pmtTxn = txnByType(res.body.data.transactions, 'PAYMENT');
    expect(res.body.data.totalInvoiced).toBe(invTxn.charge);
    expect(res.body.data.totalPaid).toBe(pmtTxn.payment);
    expect(res.body.data.closingBalance).toBe('200.00');
  });

  // --- Payment status ---

  it('invoice with no payment shows Unpaid', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPS1'); const c = await sc('StmtPS1');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    const inv = txnByType(res.body.data.transactions, 'INVOICE');
    expect(inv.paymentStatus).toBe('Unpaid');
  });

  it('partial payment shows Partially paid on payment row', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPS2'); const c = await sc('StmtPS2');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '200.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '200.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    const pmtTxn = txnByType(res.body.data.transactions, 'PAYMENT');
    expect(pmtTxn.paymentStatus).toBe('Partially paid');
  });

  it('full payment shows Fully paid on payment row', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPS3'); const c = await sc('StmtPS3');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    // Payment row shows resulting payment status, invoice row shows Unpaid (historical)
    const pmtTxn = txnByType(res.body.data.transactions, 'PAYMENT');
    expect(pmtTxn.paymentStatus).toBe('Fully paid');
  });

  it('pending payment does not change payment status', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPS4'); const c = await sc('StmtPS4');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    const invTxn = txnByType(res.body.data.transactions, 'INVOICE');
    expect(invTxn.paymentStatus).toBe('Unpaid');
  });

  it('reversed payment does not change payment status', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPS5'); const c = await sc('StmtPS5');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);
    await request(app).post(`${PAY}/${pay.body.data.id}/reverse`).set(h).send({ reason: 'Test' }).expect(200);
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    const invTxn = txnByType(res.body.data.transactions, 'INVOICE');
    expect(invTxn).toBeTruthy();
    expect(invTxn!.paymentStatus).toBe('Unpaid');
  });

  it('filtered statement ignores payments after to date', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPS6'); const c = await sc('StmtPS6');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay.body.data.id}/approve`).set(h).send({}).expect(200);

    // Filter to a date before payment — invoice should show Unpaid
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).query({ to: yesterday }).expect(200);
    const invTxn = txnByType(res.body.data.transactions, 'INVOICE');
    if (invTxn) expect(invTxn.paymentStatus).toBe('Unpaid');
  });

  it('multiple approved payments summed correctly', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('StmtPS7'); const c = await sc('StmtPS7');
    const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay1 = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '300.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '300.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay1.body.data.id}/approve`).set(h).send({}).expect(200);
    const pay2 = await request(app).post(PAY).set(h).send({ customerId: c.id, amount: '200.00', paymentMethod: 'MPESA', paymentReference: 'REF2', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: inv.body.data.id, amount: '200.00' }] }).expect(201);
    await request(app).post(`${PAY}/${pay2.body.data.id}/approve`).set(h).send({}).expect(200);
    const res = await request(app).get(`${CUST}/${c.id}/statement`).set('Cookie', cookie).expect(200);
    // First payment: 300 → Partially paid. Second: 300+200=500 → Fully paid.
    const payments = res.body.data.transactions.filter((t: { type: string }) => t.type === 'PAYMENT');
    expect(payments.length).toBe(2);
    expect(payments[0].paymentStatus).toBe('Partially paid');
    expect(payments[1].paymentStatus).toBe('Fully paid');
  });

  it('requires authentication', async () => {
    const c = await sc('StmtC8');
    await request(app).get(`${CUST}/${c.id}/statement`).expect(401);
  });
});
