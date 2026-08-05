import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const CP = `${API_BASE_PATH}/customer-payments`;
const INV = `${API_BASE_PATH}/invoices`;

async function csrfH(cookie: string) {
  const r = await request(app).get(`${API_BASE_PATH}/csrf-token`).set('Cookie', cookie);
  const issued = (r.headers['set-cookie'] as unknown as string[]) ?? [];
  const c = issued.find((v: string) => v.startsWith('greenstone.csrf='));
  return { Cookie: `${cookie}; ${c!.split(';')[0]!}`, [CSRF_HEADER_NAME]: r.body.data.csrfToken as string };
}

async function sp(n: string) { return getTestPrisma().product.create({ data: { name: n, nameNormalized: normalizeForComparison(n), category: 'HOLLOW_BLOCK', size: 'T', piecesPerPallet: 12, isActive: true } }); }
async function sc(n: string) { const ph = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`; return getTestPrisma().customer.create({ data: { name: n, phone: ph, phoneNormalized: normalizePhone(ph), isActive: true } }); }
async function sa(cid: string) { return getTestPrisma().customerAddress.create({ data: { customerId: cid, label: 'S', labelNormalized: 's', addressLine: 'R', isActive: true } }); }
async function so(cid: string, aid: string, pid: string) { return getTestPrisma().order.create({ data: { orderNumber: `ORD-2026-${String(7000 + Math.floor(Math.random() * 100))}`, customerId: cid, customerAddressId: aid, addressLabel: 'S', addressLine: 'R', paymentArrangement: 'CREDIT', totalAmount: '500.00', items: { create: { productId: pid, quantity: 10, agreedUnitPrice: '50.00', lineTotal: '500.00', remainingQuantity: 10, sortOrder: 1 } } } }); }
async function sadmin() { const { cookie } = await createSignedInUser('admin'); return { cookie }; }
const TOM = new Date(Date.now() + 86400000).toISOString();

async function seedInvoice(customerId: string, productId: string) {
  const addr = await sa(customerId);
  const order = await so(customerId, addr.id, productId);
  const { cookie } = await sadmin(); const h = await csrfH(cookie);
  const res = await request(app).post(INV).set(h).send({ orderId: order.id, dueDate: TOM }).expect(201);
  return res.body.data.id as string;
}

describe('customer-payments module', () => {
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => { await disconnectPrisma(); await disconnectTestPrisma(); });

  // ---- Creation ----
  it('creates CASH payment without reference', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const c = await sc('Payer1');
    const res = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '1000.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.paymentNumber).toMatch(/^PAY-2026-\d{4}$/);
  });

  it('rejects non-cash payment without reference', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const c = await sc('Payer2');
    await request(app).post(CP).set(h).send({ customerId: c.id, amount: '1000.00', paymentMethod: 'MPESA', paymentDate: new Date().toISOString(), paymentReference: '' }).expect(422);
  });

  // ---- Approval ----
  it('rejects approval when allocations do not equal payment amount', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PA');
    const c = await sc('PA'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '1000.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(422);
  });

  it('approves payment, creates receipt', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PB'); const c = await sc('PB'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    const res = await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(200);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.receiptNumber).toMatch(/^RCP-2026-\d{4}$/);

    // Verify receipt in detail
    const detail = await request(app).get(`${CP}/${pmt.body.data.id}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.receiptId).toBeDefined();
    expect(detail.body.data.status).toBe('APPROVED');
  });

  it('accountant cannot approve', async () => {
    const { cookie: adminCookie } = await sadmin(); const adminH = await csrfH(adminCookie);
    const p = await sp('PC'); const c = await sc('PC');
    const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(adminH).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    const { cookie } = await createSignedInUser('accountant');
    const acctH = await csrfH(cookie);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(acctH).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(403);
  });

  it('prevents double approval', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PD'); const c = await sc('PD'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(200);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(409);
  });

  // ---- Reversal ----
  it('reverses payment and voids receipt', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PE'); const c = await sc('PE'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(200);

    const res = await request(app).post(`${CP}/${pmt.body.data.id}/reverse`).set(h).send({ reason: 'Wrong amount' }).expect(200);
    expect(res.body.data.status).toBe('REVERSED');
  });

  it('rejects allocation exceeding invoice outstanding', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PF'); const c = await sc('PF');
    const invId = await seedInvoice(c.id, p.id); // KES 500 invoice
    // First: approve KES 480 → outstanding KES 20
    const pmt1 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '480.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt1.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '480.00' }] }).expect(200);
    // Second: try KES 100 → should exceed outstanding (KES 20)
    const pmt2 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '100.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt2.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '100.00' }] }).expect(422);
  });

  it('allows allocation up to outstanding', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PG'); const c = await sc('PG');
    const invId = await seedInvoice(c.id, p.id);
    const pmt1 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '480.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt1.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '480.00' }] }).expect(200);
    // Second: exactly KES 20 (outstanding) → should succeed
    const pmt2 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '20.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt2.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '20.00' }] }).expect(200);
  });

  it('reversed payments do not count as approved', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PH'); const c = await sc('PH');
    const invId = await seedInvoice(c.id, p.id);
    // Approve 400, then reverse it — outstanding should go back to 500
    const pmt1 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '400.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt1.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '400.00' }] }).expect(200);
    await request(app).post(`${CP}/${pmt1.body.data.id}/reverse`).set(h).send({ reason: 'Wrong' }).expect(200);
    // Now approve another 500 — should succeed because reversed doesn't count
    const pmt2 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${CP}/${pmt2.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(200);
  });

  it('lists payments', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).get(CP).set(h).query({ page: 1, pageSize: 10 }).expect(200);
  });
});
