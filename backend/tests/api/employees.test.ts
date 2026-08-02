import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const EMPLOYEES = `${API_BASE_PATH}/employees`;

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

async function seedEmployee(
  overrides: Partial<{ name: string; isActive: boolean; salaryFrequency: 'WEEKLY' | 'MONTHLY' }> = {},
) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().employee.create({
    data: {
      name: overrides.name ?? `Employee ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      jobTitle: 'Block producer',
      salaryFrequency: overrides.salaryFrequency ?? 'WEEKLY',
      salaryAmount: '3500.00',
      paymentMethod: 'CASH',
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('employees module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(EMPLOYEES);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('lets an accountant read employees', async () => {
      const { cookie } = await createSignedInUser('accountant');

      const response = await request(app).get(EMPLOYEES).set('Cookie', cookie);

      expect(response.status).toBe(200);
    });

    it('refuses an accountant creating an employee', async () => {
      // The approved matrix gives the Accountant read-only access to employees.
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(EMPLOYEES)
        .set(headers)
        .send({
          name: 'Not Allowed',
          phone: '0722123456',
          jobTitle: 'Curing worker',
          salaryFrequency: 'WEEKLY',
          salaryAmount: '3000.00',
          paymentMethod: 'CASH',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('refuses an accountant updating an employee', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const employee = await seedEmployee();
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${EMPLOYEES}/${employee.id}`)
        .set(headers)
        .send({ jobTitle: 'Pot producer' });

      expect(response.status).toBe(403);
    });

    it('lets an admin create an employee', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(EMPLOYEES).set(headers).send({
        name: 'Wanjiku Njoroge',
        phone: '0722123456',
        jobTitle: 'Accountant',
        salaryFrequency: 'MONTHLY',
        salaryAmount: '45000.00',
        paymentMethod: 'BANK_TRANSFER',
      });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .post(EMPLOYEES)
        .set('Cookie', cookie)
        .send({
          name: 'No CSRF',
          phone: '0722123456',
          jobTitle: 'Watchman',
          salaryFrequency: 'MONTHLY',
          salaryAmount: '20000.00',
          paymentMethod: 'CASH',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('creating', () => {
    it('creates an employee and returns a decimal string salary', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(EMPLOYEES).set(headers).send({
        name: 'Otieno Omondi',
        phone: '0722123456',
        nationalId: '23456789',
        jobTitle: 'Block producer',
        salaryFrequency: 'WEEKLY',
        salaryAmount: '3500.50',
        paymentMethod: 'MPESA',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Otieno Omondi',
        nationalId: '23456789',
        salaryFrequency: 'WEEKLY',
        salaryAmount: '3500.50',
        paymentMethod: 'MPESA',
        isActive: true,
      });
    });

    it('accepts an employee with no national ID', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(EMPLOYEES).set(headers).send({
        name: 'No ID',
        phone: '0722123456',
        jobTitle: 'Curing worker',
        salaryFrequency: 'WEEKLY',
        salaryAmount: '3000.00',
        paymentMethod: 'CASH',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.nationalId).toBeNull();
    });

    it('rejects a zero salary amount', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(EMPLOYEES).set(headers).send({
        name: 'Zero Salary',
        phone: '0722123456',
        jobTitle: 'Curing worker',
        salaryFrequency: 'WEEKLY',
        salaryAmount: '0',
        paymentMethod: 'CASH',
      });

      expect(response.status).toBe(422);
    });

    it('rejects an unknown salary frequency', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(EMPLOYEES).set(headers).send({
        name: 'Odd Frequency',
        phone: '0722123456',
        jobTitle: 'Curing worker',
        salaryFrequency: 'DAILY',
        salaryAmount: '100.00',
        paymentMethod: 'CASH',
      });

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('salaryFrequency');
    });
  });

  describe('listing', () => {
    it('filters by salary frequency', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedEmployee({ name: 'Weekly worker', salaryFrequency: 'WEEKLY' });
      await seedEmployee({ name: 'Monthly worker', salaryFrequency: 'MONTHLY' });

      const response = await request(app)
        .get(`${EMPLOYEES}?salaryFrequency=MONTHLY`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Monthly worker');
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedEmployee({ name: 'Active', isActive: true });
      await seedEmployee({ name: 'Retired', isActive: false });

      const response = await request(app).get(`${EMPLOYEES}?isActive=false`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Retired');
    });
  });

  describe('updating', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const employee = await seedEmployee({ name: 'Before' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${EMPLOYEES}/${employee.id}`)
        .set(headers)
        .send({ name: 'After', salaryAmount: '4000.00' });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ name: 'After', salaryAmount: '4000.00' });
    });

    it('clears the national ID when null is sent', async () => {
      const { cookie } = await createSignedInUser('admin');
      const employee = await getTestPrisma().employee.create({
        data: {
          name: 'Has ID',
          phone: '0722123456',
          nationalId: '11223344',
          jobTitle: 'Curing worker',
          salaryFrequency: 'WEEKLY',
          salaryAmount: '3000.00',
          paymentMethod: 'CASH',
        },
      });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${EMPLOYEES}/${employee.id}`)
        .set(headers)
        .send({ nationalId: null });

      expect(response.body.data.nationalId).toBeNull();
    });

    it('rejects an empty update', async () => {
      const { cookie } = await createSignedInUser('admin');
      const employee = await seedEmployee();
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${EMPLOYEES}/${employee.id}`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('returns 404 for an unknown employee', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${EMPLOYEES}/does-not-exist`)
        .set(headers)
        .send({ jobTitle: 'Something' });

      expect(response.status).toBe(404);
    });
  });

  describe('activation', () => {
    it('deactivates and reactivates an employee', async () => {
      const { cookie } = await createSignedInUser('admin');
      const employee = await seedEmployee({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app)
        .post(`${EMPLOYEES}/${employee.id}/deactivate`)
        .set(headers)
        .send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app)
        .post(`${EMPLOYEES}/${employee.id}/activate`)
        .set(headers)
        .send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('rejects deactivating an already inactive employee', async () => {
      const { cookie } = await createSignedInUser('admin');
      const employee = await seedEmployee({ isActive: false });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${EMPLOYEES}/${employee.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('never deletes the record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const employee = await seedEmployee();
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${EMPLOYEES}/${employee.id}/deactivate`).set(headers).send({});

      expect(
        await getTestPrisma().employee.findUnique({ where: { id: employee.id } }),
      ).not.toBeNull();
    });
  });

  describe('audit', () => {
    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app).post(EMPLOYEES).set(headers).send({
        name: 'Audited',
        phone: '0722123456',
        jobTitle: 'Curing worker',
        salaryFrequency: 'WEEKLY',
        salaryAmount: '3000.00',
        paymentMethod: 'CASH',
      });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_EMPLOYEE' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('employees');
    });

    it('records activation and deactivation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const employee = await seedEmployee({ isActive: true });
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${EMPLOYEES}/${employee.id}/deactivate`).set(headers).send({});
      await request(app).post(`${EMPLOYEES}/${employee.id}/activate`).set(headers).send({});

      const actions = await getTestPrisma().auditLog.findMany({
        where: { module: 'employees', entityId: employee.id },
        select: { action: true },
        orderBy: { createdAt: 'asc' },
      });

      expect(actions.map((row) => row.action)).toEqual(['DEACTIVATE_EMPLOYEE', 'ACTIVATE_EMPLOYEE']);
    });
  });
});
