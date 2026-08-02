import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const CUSTOMERS = `${API_BASE_PATH}/customers`;

async function csrfHeaders(cookie: string): Promise<Record<string, string>> {
  const response = await request(app).get(`${API_BASE_PATH}/csrf-token`).set('Cookie', cookie);
  const issued = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const csrfCookie = issued.find((value) => value.startsWith('greenstone.csrf='));

  if (!csrfCookie) {
    throw new Error('The CSRF endpoint did not set its cookie.');
  }

  return {
    Cookie: `${cookie}; ${csrfCookie.split(';')[0] as string}`,
    [CSRF_HEADER_NAME]: response.body.data.csrfToken as string,
  };
}

async function seedCustomer() {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().customer.create({
    data: {
      name: `Customer ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: true,
    },
  });
}

describe('customer credit module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const customer = await seedCustomer();
      const response = await request(app).get(`${CUSTOMERS}/${customer.id}/credit-status`);

      expect(response.status).toBe(401);
    });

    it('rejects an accountant setting an opening balance', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      const response = await request(app)
        .patch(`${CUSTOMERS}/${customer.id}/opening-balance`)
        .set(headers)
        .send({ amount: '500000.00', effectiveDate: '2026-01-01', reason: 'Migration' });

      // Accountant has customer-credit:read only, not set-opening-balance.
      expect(response.status).toBe(403);
    });

    it('lets an accountant read credit status', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const customer = await seedCustomer();

      const response = await request(app)
        .get(`${CUSTOMERS}/${customer.id}/credit-status`)
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
    });
  });

  describe('credit status computation', () => {
    it('reports NORMAL with no opening balance and no orders', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();

      const response = await request(app)
        .get(`${CUSTOMERS}/${customer.id}/credit-status`)
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body.data.outstandingBalance).toBe('0.00');
      expect(response.body.data.creditStatus).toBe('NORMAL');
    });

    it('classifies WARNING, STRONG_WARNING and BLOCKED thresholds correctly', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const cases: [string, string][] = [
        ['799999.00', 'NORMAL'],
        ['800000.00', 'WARNING'],
        ['899999.00', 'WARNING'],
        ['900000.00', 'STRONG_WARNING'],
        ['999999.00', 'STRONG_WARNING'],
        ['1000000.00', 'BLOCKED'],
      ];

      for (const [amount, expectedStatus] of cases) {
        const customer = await seedCustomer();

        await request(app)
          .patch(`${CUSTOMERS}/${customer.id}/opening-balance`)
          .set(headers)
          .send({ amount, effectiveDate: '2026-01-01', reason: 'Production setup' });

        const response = await request(app)
          .get(`${CUSTOMERS}/${customer.id}/credit-status`)
          .set('Cookie', cookie);

        expect(response.body.data.creditStatus).toBe(expectedStatus);
      }
    });
  });

  describe('setting the opening balance', () => {
    it('sets the opening balance and records an audit entry', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      const response = await request(app)
        .patch(`${CUSTOMERS}/${customer.id}/opening-balance`)
        .set(headers)
        .send({ amount: '250000.00', effectiveDate: '2026-01-01', reason: 'Production setup' });

      expect(response.status).toBe(200);
      expect(response.body.data.amount).toBe('250000.00');

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'SET_CUSTOMER_OPENING_BALANCE' },
      });
      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('customer-credit');
      expect(audit?.reason).toBe('Production setup');
    });

    it('corrects the opening balance in place, keeping one row per customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      await request(app)
        .patch(`${CUSTOMERS}/${customer.id}/opening-balance`)
        .set(headers)
        .send({ amount: '100000.00', effectiveDate: '2026-01-01', reason: 'First entry' });

      await request(app)
        .patch(`${CUSTOMERS}/${customer.id}/opening-balance`)
        .set(headers)
        .send({ amount: '150000.00', effectiveDate: '2026-01-02', reason: 'Correction' });

      const rows = await getTestPrisma().customerOpeningBalance.count({
        where: { customerId: customer.id },
      });
      expect(rows).toBe(1);

      const audits = await getTestPrisma().auditLog.findMany({
        where: { action: 'SET_CUSTOMER_OPENING_BALANCE' },
        orderBy: { createdAt: 'asc' },
      });
      expect(audits.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects an unknown customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${CUSTOMERS}/does-not-exist/opening-balance`)
        .set(headers)
        .send({ amount: '100000.00', effectiveDate: '2026-01-01', reason: 'Test' });

      expect(response.status).toBe(404);
    });

    it('rejects a missing reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      const response = await request(app)
        .patch(`${CUSTOMERS}/${customer.id}/opening-balance`)
        .set(headers)
        .send({ amount: '100000.00', effectiveDate: '2026-01-01', reason: '' });

      expect(response.status).toBe(422);
    });
  });
});
