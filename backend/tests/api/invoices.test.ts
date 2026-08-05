import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const INV = `${API_BASE_PATH}/invoices`;
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
async function so(cid: string, aid: string, pid: string) { return getTestPrisma().order.create({ data: { orderNumber: `ORD-2026-${String(7000 + Math.floor(Math.random() * 100))}`, customerId: cid, customerAddressId: aid, addressLabel: 'S', addressLine: 'R', paymentArrangement: 'CREDIT', totalAmount: '500.00', items: { create: { productId: pid, quantity: 10, agreedUnitPrice: '50.00', lineTotal: '500.00', remainingQuantity: 10, sortOrder: 1 } } } }); }
async function sadmin() { const { cookie } = await createSignedInUser('admin'); return { cookie }; }

describe('invoices module', () => {
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => { await disconnectPrisma(); await disconnectTestPrisma(); });

  it('creates invoice', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('InvA'); const c = await sc('InvA'); const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const res = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    expect(res.body.data.invoiceNumber).toMatch(/^INV-2026-\d{4}$/);
    expect(res.body.data.items[0].productName).toBe('InvA');
  });

  it('rejects cancelled order', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await sp('C1'); const c = await sc('C1'); const a = await sa(c.id);
    const o = await getTestPrisma().order.create({ data: { orderNumber: 'ORD-2026-7999', customerId: c.id, customerAddressId: a.id, addressLabel: 'S', addressLine: 'R', paymentArrangement: 'CREDIT', status: 'CANCELLED', statusReason: 'T', totalAmount: '0' } });
    await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(422);
  });

  it('one per order', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('U1'); const c = await sc('U1'); const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(409);
  });

  it('voids invoice', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const p = await sp('V1'); const c = await sc('V1'); const a = await sa(c.id); const o = await so(c.id, a.id, p.id);
    const inv = await request(app).post(INV).set(h).send({ orderId: o.id, dueDate: TOM }).expect(201);
    const res = await request(app).post(`${INV}/${inv.body.data.id}/void`).set(h).send({ reason: 'Wrong' }).expect(200);
    expect(res.body.data.status).toBe('VOIDED');
  });

  it('lists', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).get(INV).set(h).query({ page: 1, pageSize: 10 }).expect(200);
  });
});
