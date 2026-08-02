import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeEmail, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const SUPPLIERS = `${API_BASE_PATH}/suppliers`;

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

async function seedSupplier(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().supplier.create({
    data: {
      name: overrides.name ?? `Supplier ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('suppliers module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(SUPPLIERS);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('lets an accountant create a supplier', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(SUPPLIERS)
        .set(headers)
        .send({ name: 'Kamau Hardware', phone: '0722123456' });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .post(SUPPLIERS)
        .set('Cookie', cookie)
        .send({ name: 'No CSRF', phone: '0722123456' });

      expect(response.status).toBe(403);
    });
  });

  describe('creating', () => {
    it('creates a supplier with optional fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(SUPPLIERS).set(headers).send({
        name: 'Rift Valley Cement',
        phone: '0722123456',
        email: 'sales@riftvalleycement.co.ke',
        address: 'Industrial Area, Nairobi',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Rift Valley Cement',
        email: 'sales@riftvalleycement.co.ke',
        address: 'Industrial Area, Nairobi',
        isActive: true,
      });
    });

    it('accepts a supplier with no email or address', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(SUPPLIERS)
        .set(headers)
        .send({ name: 'No Extras Ltd', phone: '0733111222' });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBeNull();
      expect(response.body.data.address).toBeNull();
    });

    it('rejects a duplicate phone number regardless of formatting', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(SUPPLIERS)
        .set(headers)
        .send({ name: 'Alpha Supplies', phone: '0722123456' });

      const second = await request(app)
        .post(SUPPLIERS)
        .set(headers)
        .send({ name: 'Beta Supplies', phone: '0722 123 456' });

      expect(second.status).toBe(422);
      expect(second.body.error.message).toMatch(/phone number already belongs to Alpha Supplies/i);
    });

    it('rejects a duplicate email regardless of case', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app).post(SUPPLIERS).set(headers).send({
        name: 'Gamma Supplies',
        phone: '0700111222',
        email: 'orders@gamma.co.ke',
      });

      const second = await request(app).post(SUPPLIERS).set(headers).send({
        name: 'Delta Supplies',
        phone: '0700333444',
        email: 'ORDERS@gamma.co.ke',
      });

      expect(second.status).toBe(422);
      expect(second.body.error.message).toMatch(/email address already belongs to Gamma Supplies/i);
    });

    it('rejects an unexpected field', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(SUPPLIERS)
        .set(headers)
        .send({ name: 'Extra Field', phone: '0722123456', hireCost: '500' });

      expect(response.status).toBe(422);
    });
  });

  describe('listing', () => {
    it('searches by name', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedSupplier({ name: 'Nairobi Steel' });
      await seedSupplier({ name: 'Mombasa Timber' });

      const response = await request(app).get(`${SUPPLIERS}?search=Steel`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Nairobi Steel');
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedSupplier({ name: 'Active', isActive: true });
      await seedSupplier({ name: 'Retired', isActive: false });

      const response = await request(app).get(`${SUPPLIERS}?isActive=false`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Retired');
    });
  });

  describe('updating', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplier({ name: 'Before' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${SUPPLIERS}/${supplier.id}`)
        .set(headers)
        .send({ name: 'After', address: 'New address' });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ name: 'After', address: 'New address' });
    });

    it('lets a supplier keep its own phone number while editing other fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplier();
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${SUPPLIERS}/${supplier.id}`)
        .set(headers)
        .send({ phone: supplier.phone, address: 'Same phone, new address' });

      expect(response.status).toBe(200);
    });

    it('rejects updating onto another supplier\'s phone number', async () => {
      const { cookie } = await createSignedInUser('admin');
      const first = await seedSupplier({ name: 'First' });
      const second = await seedSupplier({ name: 'Second' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${SUPPLIERS}/${second.id}`)
        .set(headers)
        .send({ phone: first.phone });

      expect(response.status).toBe(422);
    });

    it('returns 404 for an unknown supplier', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${SUPPLIERS}/does-not-exist`)
        .set(headers)
        .send({ name: 'Something' });

      expect(response.status).toBe(404);
    });
  });

  describe('activation', () => {
    it('deactivates and reactivates a supplier', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplier({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app)
        .post(`${SUPPLIERS}/${supplier.id}/deactivate`)
        .set(headers)
        .send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app)
        .post(`${SUPPLIERS}/${supplier.id}/activate`)
        .set(headers)
        .send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('rejects deactivating an already inactive supplier', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplier({ isActive: false });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${SUPPLIERS}/${supplier.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('never deletes the record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplier();
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${SUPPLIERS}/${supplier.id}/deactivate`).set(headers).send({});

      expect(
        await getTestPrisma().supplier.findUnique({ where: { id: supplier.id } }),
      ).not.toBeNull();
    });
  });

  describe('audit', () => {
    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(SUPPLIERS)
        .set(headers)
        .send({ name: 'Audited', phone: '0722123456' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_SUPPLIER' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('suppliers');
    });
  });

  it('normalises email lowercase for comparison', () => {
    expect(normalizeEmail('ORDERS@Gamma.CO.KE')).toBe('orders@gamma.co.ke');
  });
});
