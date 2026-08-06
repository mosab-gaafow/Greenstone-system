import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const RCP = `${API_BASE_PATH}/receipts`;
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
async function so(cid: string, aid: string, pid: string) { return getTestPrisma().order.create({ data: { orderNumber: `ORD-2026-${String(8000 + Math.floor(Math.random() * 100))}`, customerId: cid, customerAddressId: aid, addressLabel: 'S', addressLine: 'R', paymentArrangement: 'CREDIT', totalAmount: '500.00', items: { create: { productId: pid, quantity: 10, agreedUnitPrice: '50.00', lineTotal: '500.00', remainingQuantity: 10, sortOrder: 1 } } } }); }
async function sadmin() { const { cookie } = await createSignedInUser('admin'); return { cookie }; }

/** Helper: create an invoice, then a payment, then approve it. Returns the receipt. */
async function createApprovedPaymentWithReceipt() {
  const { cookie } = await sadmin();
  const h = await csrfH(cookie);

  const p = await sp('RcpProd');
  const c = await sc('RcpCust');
  const a = await sa(c.id);
  const o = await so(c.id, a.id, p.id);
  const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
  const invId = inv.body.data.id;

  const pay = await request(app).post(PAY).set(h).send({
    customerId: c.id, amount: '500.00', paymentMethod: 'MPESA',
    paymentReference: 'REF123', paymentDate: new Date().toISOString(),
    allocations: [{ invoiceId: invId, amount: '500.00' }],
  }).expect(201);
  const payId = pay.body.data.id;

  await request(app).post(`${PAY}/${payId}/approve`).set(h).send({}).expect(200);

  const payDetail = await request(app).get(`${PAY}/${payId}`).set('Cookie', cookie).expect(200);
  const receiptId = payDetail.body.data.receiptId as string;
  const receiptNumber = payDetail.body.data.receiptNumber as string;
  return { cookie, receiptId, receiptNumber, paymentId: payId, invoiceId: invId, customerId: c.id };
}

describe('receipts module', () => {
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => { await disconnectPrisma(); await disconnectTestPrisma(); });

  // --- Detail ---

  it('returns receipt detail after payment approval', async () => {
    const { cookie, receiptId, receiptNumber } = await createApprovedPaymentWithReceipt();
    const res = await request(app).get(`${RCP}/${receiptId}`).set('Cookie', cookie).expect(200);
    expect(res.body.data.receiptNumber).toBe(receiptNumber);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.amount).toBe('500.00');
    expect(res.body.data.payment.status).toBe('APPROVED');
    expect(res.body.data.allocations.length).toBe(1);
  });

  it('receipt belongs to correct payment and customer', async () => {
    const { cookie, receiptId, paymentId, customerId } = await createApprovedPaymentWithReceipt();
    const res = await request(app).get(`${RCP}/${receiptId}`).set('Cookie', cookie).expect(200);
    expect(res.body.data.payment.id).toBe(paymentId);
    expect(res.body.data.customer.id).toBe(customerId);
  });

  it('pending payment has no receipt', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('NoRcp'); const c = await sc('NoRcp'); const a = await sa(c.id);
    const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const pay = await request(app).post(PAY).set(h).send({
      customerId: c.id, amount: '500.00', paymentMethod: 'CASH',
      paymentDate: new Date().toISOString(),
      allocations: [{ invoiceId: inv.body.data.id, amount: '500.00' }],
    }).expect(201);
    // Pending payment: receipt should be null
    const detail = await request(app).get(`${PAY}/${pay.body.data.id}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.receiptId).toBeNull();
  });

  it('receipt not found for random UUID', async () => {
    const { cookie } = await sadmin();
    await request(app).get(`${RCP}/00000000-0000-0000-0000-000000000000`).set('Cookie', cookie).expect(404);
  });

  // --- PDF ---

  it('downloads receipt PDF', async () => {
    const { cookie, receiptId } = await createApprovedPaymentWithReceipt();
    await request(app)
      .get(`${RCP}/${receiptId}/pdf`)
      .set('Cookie', cookie)
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
  });

  it('receipt PDF requires authentication', async () => {
    const { receiptId } = await createApprovedPaymentWithReceipt();
    await request(app).get(`${RCP}/${receiptId}/pdf`).expect(401);
  });

  it('receipt PDF returns no-cache headers', async () => {
    const { cookie, receiptId } = await createApprovedPaymentWithReceipt();
    const res = await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);
    expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
    expect(res.headers['pragma']).toBe('no-cache');
    expect(res.headers['expires']).toBe('0');
  });

  it('receipt PDF has correct filename', async () => {
    const { cookie, receiptId, receiptNumber } = await createApprovedPaymentWithReceipt();
    const res = await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);
    expect(res.headers['content-disposition']).toContain('Receipt_');
    expect(res.headers['content-disposition']).toContain(`${receiptNumber}.pdf`);
  });

  it('creates a new PDF version on each download', async () => {
    const { cookie, receiptId } = await createApprovedPaymentWithReceipt();
    await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);
    await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);
    const docs = await getTestPrisma().generatedDocument.findMany({
      where: { documentType: 'RECEIPT', relatedEntityId: receiptId },
      orderBy: { version: 'asc' },
    });
    expect(docs.length).toBe(2);
    expect(docs[0]!.version).toBe(1);
    expect(docs[1]!.version).toBe(2);
  });

  it('receipt PDF is one A4 page', async () => {
    const { cookie, receiptId } = await createApprovedPaymentWithReceipt();
    const res = await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);
    const body = res.body as Buffer;
    const match = /\/Count\s+(\d+)/.exec(body.toString('latin1'));
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(1);
  });

  it('reversed payment receipt shows VOIDED', async () => {
    const { cookie, receiptId, paymentId } = await createApprovedPaymentWithReceipt();
    const h = await csrfH(cookie);

    // Reverse the payment
    await request(app).post(`${PAY}/${paymentId}/reverse`).set(h).send({ reason: 'Test reversal' }).expect(200);

    const res = await request(app).get(`${RCP}/${receiptId}`).set('Cookie', cookie).expect(200);
    expect(res.body.data.status).toBe('VOIDED');
    expect(res.body.data.payment.status).toBe('REVERSED');
  });

  it('reversed payment receipt PDF is still accessible', async () => {
    const { cookie, receiptId, paymentId } = await createApprovedPaymentWithReceipt();
    const h = await csrfH(cookie);
    await request(app).post(`${PAY}/${paymentId}/reverse`).set(h).send({ reason: 'Test reversal' }).expect(200);

    await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);
  });

  it('receipt financial data remains unchanged after PDF download', async () => {
    const { cookie, receiptId } = await createApprovedPaymentWithReceipt();
    const before = await request(app).get(`${RCP}/${receiptId}`).set('Cookie', cookie).expect(200);

    await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);
    await request(app).get(`${RCP}/${receiptId}/pdf`).set('Cookie', cookie).expect(200);

    const after = await request(app).get(`${RCP}/${receiptId}`).set('Cookie', cookie).expect(200);
    expect(after.body.data.amount).toBe(before.body.data.amount);
    expect(after.body.data.status).toBe(before.body.data.status);
    expect(after.body.data.receiptNumber).toBe(before.body.data.receiptNumber);
    expect(after.body.data.payment.amount).toBe(before.body.data.payment.amount);
  });

  it('receipt includes invoice allocations', async () => {
    const { cookie, receiptId, invoiceId } = await createApprovedPaymentWithReceipt();
    const res = await request(app).get(`${RCP}/${receiptId}`).set('Cookie', cookie).expect(200);
    expect(res.body.data.allocations.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.allocations[0].invoiceId).toBe(invoiceId);
  });
});
