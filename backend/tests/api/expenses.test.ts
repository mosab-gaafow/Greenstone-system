import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const EXP = `${API_BASE_PATH}/expenses`;

async function csrfH(cookie: string) {
  const r = await request(app).get(`${API_BASE_PATH}/csrf-token`).set('Cookie', cookie);
  const issued = (r.headers['set-cookie'] as unknown as string[]) ?? [];
  const c = issued.find((v: string) => v.startsWith('greenstone.csrf='));
  return { Cookie: `${cookie}; ${c!.split(';')[0]!}`, [CSRF_HEADER_NAME]: r.body.data.csrfToken as string };
}
async function sadmin() { const { cookie } = await createSignedInUser('admin'); return { cookie }; }
async function saccountant() { const { cookie } = await createSignedInUser('accountant'); return { cookie }; }

describe('expenses module', () => {
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => { await disconnectPrisma(); await disconnectTestPrisma(); });

  it('creates expense without evidence', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'RENT', description: 'Office rent', amount: '15000.00', paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRX123', expenseDate: new Date().toISOString() }).expect(201);
    expect(res.body.data.expenseNumber).toMatch(/^EXP-2026-\d{4}$/);
    expect(res.body.data.category).toBe('RENT');
    expect(res.body.data.evidence).toBeNull();
  });

  it('creates expense with evidence', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).attach('evidenceFile', Buffer.from('%PDF-1.4 test'), 'receipt.pdf').field('category', 'SUPPLIES').field('description', 'Paper').field('amount', '500.00').field('paymentMethod', 'CASH').field('expenseDate', new Date().toISOString()).expect(201);
    expect(res.body.data.evidence).not.toBeNull();
    expect(res.body.data.evidence.originalFileName).toBe('receipt.pdf');
  });

  it('rejects future expense date', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'Future', amount: '100.00', paymentMethod: 'CASH', expenseDate: future }).expect(422);
  });

  it('rejects zero amount', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'Zero', amount: '0.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(422);
  });

  it('rejects invalid category', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).post(EXP).set(h).send({ category: 'INVALID', description: 'Bad', amount: '100.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(422);
  });

  it('rejects non-cash without reference', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).post(EXP).set(h).send({ category: 'TRANSPORT', description: 'Fuel', amount: '500.00', paymentMethod: 'MPESA', expenseDate: new Date().toISOString() }).expect(422);
  });

  it('lists expenses', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).post(EXP).set(h).send({ category: 'RENT', description: 'Office', amount: '10000.00', paymentMethod: 'BANK_TRANSFER', paymentReference: 'R123', expenseDate: new Date().toISOString() }).expect(201);
    const res = await request(app).get(EXP).set('Cookie', cookie).query({ page: 1, pageSize: 10 }).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by category', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).post(EXP).set(h).send({ category: 'RENT', description: 'R', amount: '100.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    await request(app).post(EXP).set(h).send({ category: 'WATER', description: 'W', amount: '200.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    const res = await request(app).get(EXP).set('Cookie', cookie).query({ page: 1, pageSize: 10, category: 'RENT' }).expect(200);
    expect(res.body.data.length).toBe(1);
  });

  it('downloads evidence', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const pdfBytes = Buffer.from('%PDF-1.4 evidence');
    const res = await request(app).post(EXP).set(h).attach('evidenceFile', pdfBytes, 'bill.pdf').field('category', 'OTHER').field('description', 'Test').field('amount', '100.00').field('paymentMethod', 'CASH').field('expenseDate', new Date().toISOString()).expect(201);
    const ev = await request(app).get(`${EXP}/${res.body.data.id}/evidence`).set('Cookie', cookie).expect(200);
    expect(ev.headers['content-type']).toBe('application/pdf');
  });

  it('evidence download returns 404 without evidence', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'No ev', amount: '100.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    await request(app).get(`${EXP}/${res.body.data.id}/evidence`).set('Cookie', cookie).expect(404);
  });

  it('requires authentication', async () => {
    await request(app).post(EXP).send({ category: 'OTHER', description: 'T', amount: '1.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(401);
    await request(app).get(EXP).expect(401);
  });

  it('accountant can create and read', async () => {
    const { cookie } = await saccountant(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'SUPPLIES', description: 'Pens', amount: '50.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    await request(app).get(`${EXP}/${res.body.data.id}`).set('Cookie', cookie).expect(200);
  });

  // --- Edit ---

  it('updates an expense', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'Old', amount: '100.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    const id = res.body.data.id;
    const upd = await request(app).patch(`${EXP}/${id}`).set(h).send({ description: 'Updated', amount: '200.00' }).expect(200);
    expect(upd.body.data.description).toBe('Updated');
    expect(upd.body.data.amount).toBe('200.00');
  });

  it('preserves expense number after update', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'X', amount: '50.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    const num = res.body.data.expenseNumber;
    await request(app).patch(`${EXP}/${res.body.data.id}`).set(h).send({ description: 'Y' }).expect(200);
    const detail = await request(app).get(`${EXP}/${res.body.data.id}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.expenseNumber).toBe(num);
  });

  it('preserves evidence when no new file is provided', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).attach('evidenceFile', Buffer.from('%PDF-1.4 ev'), 'file.pdf').field('category', 'OTHER').field('description', 'With evidence').field('amount', '50.00').field('paymentMethod', 'CASH').field('expenseDate', new Date().toISOString()).expect(201);
    await request(app).patch(`${EXP}/${res.body.data.id}`).set(h).send({ description: 'Changed' }).expect(200);
    const detail = await request(app).get(`${EXP}/${res.body.data.id}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.evidence).not.toBeNull();
    expect(detail.body.data.evidence.originalFileName).toBe('file.pdf');
  });

  it('rejects zero amount update', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'X', amount: '50.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    await request(app).patch(`${EXP}/${res.body.data.id}`).set(h).send({ amount: '0.00' }).expect(422);
  });

  it('creates audit log on update', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'X', amount: '50.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    await request(app).patch(`${EXP}/${res.body.data.id}`).set(h).send({ description: 'Updated via test' }).expect(200);
    const audit = await getTestPrisma().auditLog.findFirst({ where: { entityId: res.body.data.id, action: 'UPDATE_EXPENSE' } });
    expect(audit).not.toBeNull();
  });

  it('rejects update for unknown expense', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    await request(app).patch(`${EXP}/00000000-0000-0000-0000-000000000000`).set(h).send({ description: 'Nope' }).expect(404);
  });

  it('requires authentication for update', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const res = await request(app).post(EXP).set(h).send({ category: 'OTHER', description: 'X', amount: '1.00', paymentMethod: 'CASH', expenseDate: new Date().toISOString() }).expect(201);
    await request(app).patch(`${EXP}/${res.body.data.id}`).send({ description: 'No auth' }).expect(401);
  });
});
