import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const SAL = `${API_BASE_PATH}/salaries`;

async function csrfH(cookie: string) {
  const r = await request(app).get(`${API_BASE_PATH}/csrf-token`).set('Cookie', cookie);
  const issued = (r.headers['set-cookie'] as unknown as string[]) ?? [];
  const c = issued.find((v: string) => v.startsWith('greenstone.csrf='));
  return { Cookie: `${cookie}; ${c!.split(';')[0]!}`, [CSRF_HEADER_NAME]: r.body.data.csrfToken as string };
}
async function sadmin() { const { cookie } = await createSignedInUser('admin'); return { cookie }; }
async function saccountant() { const { cookie } = await createSignedInUser('accountant'); return { cookie }; }

async function seedEmployee() {
  return getTestPrisma().employee.create({ data: { name: 'Test Emp', phone: '0712345678', jobTitle: 'Worker', salaryFrequency: 'MONTHLY', salaryAmount: '15000.00', paymentMethod: 'CASH' } });
}

describe('salaries module', () => {
  beforeEach(async () => { await truncateAll(); });
  afterAll(async () => { await disconnectPrisma(); await disconnectTestPrisma(); });

  it('registers weekly salary', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const res = await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'WEEKLY', periodStart: '2026-08-01', periodEnd: '2026-08-07', amount: '3500.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    expect(res.body.data.salaryNumber).toMatch(/^SAL-2026-\d{4}$/);
  });

  it('registers monthly salary', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const res = await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-08-01', periodEnd: '2026-08-31', amount: '15000.00', paymentMethod: 'BANK_TRANSFER', paymentReference: 'SAL-REF', paymentDate: new Date().toISOString() }).expect(201);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('rejects overlapping period', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const today = new Date().toISOString();
    // First salary: Jan 1-31
    await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-01-01', periodEnd: '2026-01-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: today }).expect(201);
    // Overlapping: Jan 15 - Feb 14 should be rejected
    const res2 = await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-01-15', periodEnd: '2026-02-14', amount: '15000.00', paymentMethod: 'CASH', paymentDate: today });
    expect(res2.status).toBeGreaterThanOrEqual(400);
  });

  it('accepts non-overlapping period', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const today = new Date().toISOString();
    await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-01-01', periodEnd: '2026-01-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: today }).expect(201);
    await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-02-01', periodEnd: '2026-02-28', amount: '15000.00', paymentMethod: 'CASH', paymentDate: today }).expect(201);
  });

  it('approves salary', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const res = await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-08-01', periodEnd: '2026-08-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${SAL}/${res.body.data.id}/approve`).set(h).send({}).expect(200);
    const detail = await request(app).get(`${SAL}/${res.body.data.id}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.status).toBe('APPROVED');
  });

  it('reverses salary', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const res = await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-08-01', periodEnd: '2026-08-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${SAL}/${res.body.data.id}/approve`).set(h).send({}).expect(200);
    await request(app).post(`${SAL}/${res.body.data.id}/reverse`).set(h).send({ reason: 'Error' }).expect(200);
    const detail = await request(app).get(`${SAL}/${res.body.data.id}`).set('Cookie', cookie).expect(200);
    expect(detail.body.data.status).toBe('REVERSED');
  });

  it('accountant cannot approve', async () => {
    const { cookie: acct } = await saccountant(); const { cookie: admin } = await sadmin();
    const hAdmin = await csrfH(admin); const hAcct = await csrfH(acct);
    const emp = await seedEmployee();
    const res = await request(app).post(SAL).set(hAdmin).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-08-01', periodEnd: '2026-08-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).post(`${SAL}/${res.body.data.id}/approve`).set(hAcct).send({}).expect(403);
  });

  it('lists salaries', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-08-01', periodEnd: '2026-08-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: new Date().toISOString() }).expect(201);
    await request(app).get(SAL).set('Cookie', cookie).query({ page: 1, pageSize: 10 }).expect(200);
  });

  it('edits pending salary', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const today = new Date().toISOString();
    const res = await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-01-01', periodEnd: '2026-01-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: today }).expect(201);
    const upd = await request(app).patch(`${SAL}/${res.body.data.id}`).set(h).send({ amount: '16000.00', notes: 'Updated notes' }).expect(200);
    expect(upd.body.data.amount).toBe('16000.00');
    expect(upd.body.data.notes).toBe('Updated notes');
  });

  it('rejects edit of approved salary', async () => {
    const { cookie } = await sadmin(); const h = await csrfH(cookie);
    const emp = await seedEmployee();
    const today = new Date().toISOString();
    const res = await request(app).post(SAL).set(h).send({ employeeId: emp.id, salaryType: 'MONTHLY', periodStart: '2026-01-01', periodEnd: '2026-01-31', amount: '15000.00', paymentMethod: 'CASH', paymentDate: today }).expect(201);
    await request(app).post(`${SAL}/${res.body.data.id}/approve`).set(h).send({}).expect(200);
    await request(app).patch(`${SAL}/${res.body.data.id}`).set(h).send({ amount: '20000.00' }).expect(409);
  });

  it('requires authentication', async () => {
    await request(app).post(SAL).send({}).expect(401);
    await request(app).get(SAL).expect(401);
  });
});
