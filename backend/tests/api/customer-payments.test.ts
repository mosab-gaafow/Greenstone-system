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
  it('creates CASH payment with allocation', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('P0'); const c = await sc('Payer1');
    const invId = await seedInvoice(c.id, p.id);
    const res = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.paymentNumber).toMatch(/^PAY-2026-\d{4}$/);
  });

  it('rejects non-cash payment without reference', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const pp = await sp('P02'); const c = await sc('Payer2');
    const invId = await seedInvoice(c.id, pp.id);
    await request(app).post(CP).set(h).send({ customerId: c.id, amount: '1000.00', paymentMethod: 'MPESA', paymentDate: new Date().toISOString(), paymentReference: '', allocations: [{ invoiceId: invId, amount: '1000.00' }] }).expect(422);
  });

  // ---- Approval ----
  it('rejects approval when allocations do not equal payment amount', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PA');
    const c = await sc('PA'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '1000.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: "500.00" }] }).expect(201);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(422);
  });

  it('approves payment, creates receipt', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PB'); const c = await sc('PB'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: "500.00" }] }).expect(201);
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
    const pmt = await request(app).post(CP).set(adminH).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: "500.00" }] }).expect(201);
    const { cookie } = await createSignedInUser('accountant');
    const acctH = await csrfH(cookie);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(acctH).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(403);
  });

  it('prevents double approval', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PD'); const c = await sc('PD'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: "500.00" }] }).expect(201);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(200);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(409);
  });

  // ---- Reversal ----
  it('reverses payment and voids receipt', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PE'); const c = await sc('PE'); const invId = await seedInvoice(c.id, p.id);
    const pmt = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: "500.00" }] }).expect(201);
    await request(app).post(`${CP}/${pmt.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(200);

    const res = await request(app).post(`${CP}/${pmt.body.data.id}/reverse`).set(h).send({ reason: 'Wrong amount' }).expect(200);
    expect(res.body.data.status).toBe('REVERSED');
  });

  it('rejects allocation exceeding invoice outstanding', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PF'); const c = await sc('PF');
    const invId = await seedInvoice(c.id, p.id); // KES 500 invoice
    // First: approve KES 480 → outstanding KES 20
    const pmt1 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '480.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: '480.00' }] }).expect(201);
    await request(app).post(`${CP}/${pmt1.body.data.id}/approve`).set(h).send({}).expect(200);
    // Second: try KES 100 → should exceed outstanding (KES 20)
    const pmt2 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '100.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: '100.00' }] }).expect(201);
    await request(app).post(`${CP}/${pmt2.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '100.00' }] }).expect(422);
  });

  it('allows allocation up to outstanding', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PG'); const c = await sc('PG');
    const invId = await seedInvoice(c.id, p.id);
    const pmt1 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '480.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: '480.00' }] }).expect(201);
    await request(app).post(`${CP}/${pmt1.body.data.id}/approve`).set(h).send({}).expect(200);
    // Second: exactly KES 20 (outstanding) → should succeed
    const pmt2 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '20.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: '20.00' }] }).expect(201);
    await request(app).post(`${CP}/${pmt2.body.data.id}/approve`).set(h).send({}).expect(200);
  });

  it('reversed payments do not count as approved', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('PH'); const c = await sc('PH');
    const invId = await seedInvoice(c.id, p.id);
    // Approve 400, then reverse it — outstanding should go back to 500
    const pmt1 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '400.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: '400.00' }] }).expect(201);
    await request(app).post(`${CP}/${pmt1.body.data.id}/approve`).set(h).send({}).expect(200);
    await request(app).post(`${CP}/${pmt1.body.data.id}/reverse`).set(h).send({ reason: 'Wrong' }).expect(200);
    // Now approve another 500 — should succeed because reversed doesn't count
    const pmt2 = await request(app).post(CP).set(h).send({ customerId: c.id, amount: '500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString(), allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(201);
    await request(app).post(`${CP}/${pmt2.body.data.id}/approve`).set(h).send({ allocations: [{ invoiceId: invId, amount: '500.00' }] }).expect(200);
  });

  it('lists payments', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).get(CP).set(h).query({ page: 1, pageSize: 10 }).expect(200);
  });

  // --- Evidence ---

  async function createPayment(cookie: string, customerId: string, invoiceId: string) {
    const h = await csrfH(cookie);
    return request(app).post(CP).set(h).send({
      customerId, amount: '500.00', paymentMethod: 'CASH',
      paymentDate: new Date().toISOString(),
      allocations: [{ invoiceId, amount: '500.00' }],
    }).expect(201);
  }

  it('upload valid evidence succeeds', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvP'); const c = await sc('EvC');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const h = await csrfH(cookie);
    await request(app)
      .post(`${CP}/${payId}/evidence`)
      .set(h)
      .attach('evidenceFile', Buffer.from('%PDF-1.4 fake pdf'), 'receipt.pdf')
      .expect(200);

    const detail = await request(app).get(`${CP}/${payId}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.evidence).not.toBeNull();
    expect(detail.body.data.evidence.originalFileName).toBe('receipt.pdf');
  });

  it('rejects invalid file type', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvT'); const c = await sc('EvT');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const h = await csrfH(cookie);
    await request(app)
      .post(`${CP}/${payId}/evidence`)
      .set(h)
      .attach('evidenceFile', Buffer.from('hello'), 'test.txt')
      .expect(422);
  });

  it('replaces existing evidence', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvR'); const c = await sc('EvR');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const h = await csrfH(cookie);
    // Upload first
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', Buffer.from('%PDF-1.4 first'), 'first.pdf').expect(200);
    // Replace
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', Buffer.from('%PDF-1.4 second'), 'second.pdf').expect(200);

    const detail = await request(app).get(`${CP}/${payId}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.evidence.originalFileName).toBe('second.pdf');
  });

  it('downloads uploaded PDF evidence', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvD'); const c = await sc('EvD');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const pdfBytes = Buffer.from('%PDF-1.4 test content');
    const h = await csrfH(cookie);
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', pdfBytes, 'receipt.pdf').expect(200);

    const res = await request(app).get(`${CP}/${payId}/evidence`)
      .set('Cookie', cookie).expect(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('receipt.pdf');
    expect(res.body.equals(pdfBytes)).toBe(true);
  });

  it('downloads uploaded PNG evidence', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvPNG'); const c = await sc('EvPNG');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const pngBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
    const h = await csrfH(cookie);
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', pngBytes, 'proof.png').expect(200);

    const res = await request(app).get(`${CP}/${payId}/evidence`)
      .set('Cookie', cookie).expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.body.equals(pngBytes)).toBe(true);
  });

  it('preview uses inline disposition', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvPre'); const c = await sc('EvPre');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const pdfBytes = Buffer.from('%PDF-1.4 preview');
    const h = await csrfH(cookie);
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', pdfBytes, 'doc.pdf').expect(200);

    const res = await request(app).get(`${CP}/${payId}/evidence?disposition=inline`)
      .set('Cookie', cookie).expect(200);
    expect(res.headers['content-disposition']).toContain('inline');
  });

  it('download defaults to attachment disposition', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvAtt'); const c = await sc('EvAtt');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const h = await csrfH(cookie);
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', Buffer.from('%PDF-1.4'), 'doc.pdf').expect(200);

    const res = await request(app).get(`${CP}/${payId}/evidence`)
      .set('Cookie', cookie).expect(200);
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('invalid disposition is rejected', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvInv'); const c = await sc('EvInv');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const h = await csrfH(cookie);
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', Buffer.from('%PDF-1.4'), 'doc.pdf').expect(200);

    await request(app).get(`${CP}/${payId}/evidence?disposition=none`)
      .set('Cookie', cookie).expect(422);
  });

  it('payment without evidence returns 404', async () => {
    const { cookie } = await sadmin();
    const p = await sp('Ev404'); const c = await sc('Ev404');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    await request(app).get(`${CP}/${pay.body.data.id}/evidence`)
      .set('Cookie', cookie).expect(404);
  });

  it('evidence download requires authentication', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvA'); const c = await sc('EvA');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const h = await csrfH(cookie);
    await request(app).post(`${CP}/${payId}/evidence`).set(h)
      .attach('evidenceFile', Buffer.from('%PDF-1.4 test'), 'test.pdf').expect(200);

    await request(app).get(`${CP}/${payId}/evidence`).expect(401);
  });

  it('payment approval works without evidence', async () => {
    const { cookie } = await sadmin();
    const p = await sp('EvNo'); const c = await sc('EvNo');
    const invId = await seedInvoice(c.id, p.id);
    const pay = await createPayment(cookie, c.id, invId);
    const payId = pay.body.data.id;

    const h = await csrfH(cookie);
    await request(app).post(`${CP}/${payId}/approve`).set(h).send({}).expect(200);

    const detail = await request(app).get(`${CP}/${payId}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.status).toBe('APPROVED');
    expect(detail.body.data.evidence).toBeNull();
  });
});
