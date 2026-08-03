import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { normalizeNationalId } from '../../src/shared/utils/normalize.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const DRIVERS = `${API_BASE_PATH}/drivers`;

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

async function seedDriver(
  overrides: Partial<{ name: string; nationalId: string; isActive: boolean }> = {},
) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;
  const nationalId = overrides.nationalId ?? String(Math.floor(10000000 + Math.random() * 89999999));

  return getTestPrisma().driver.create({
    data: {
      name: overrides.name ?? `Driver ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      nationalId,
      nationalIdNormalized: normalizeNationalId(nationalId),
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('drivers module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(DRIVERS);
      expect(response.status).toBe(401);
    });

    it('lets an accountant create a driver', async () => {
      // The approved matrix gives the Accountant full driver management.
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(DRIVERS)
        .set(headers)
        .send({ name: 'Kamau Driver', phone: '0722123456', nationalId: '20011122' });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .post(DRIVERS)
        .set('Cookie', cookie)
        .send({ name: 'No CSRF', phone: '0722123456', nationalId: '20011123' });

      expect(response.status).toBe(403);
    });
  });

  describe('creating and listing', () => {
    it('creates a driver', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(DRIVERS)
        .set(headers)
        .send({ name: 'Otieno Driver', phone: '0722123456', nationalId: '20011124' });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Otieno Driver',
        phone: '0722123456',
        nationalId: '20011124',
        isActive: true,
      });
    });

    it('rejects a duplicate national ID', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedDriver({ nationalId: '30012345' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(DRIVERS)
        .set(headers)
        .send({ name: 'Someone Else', phone: '0733222333', nationalId: '30012345' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('rejects a duplicate national ID differing only by case and spacing', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedDriver({ nationalId: '30012345' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(DRIVERS)
        .set(headers)
        .send({ name: 'Someone Else', phone: '0733222333', nationalId: ' 3001 2345 ' });

      expect(response.status).toBe(422);
    });

    it('rejects a missing national ID', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(DRIVERS)
        .set(headers)
        .send({ name: 'No ID', phone: '0722123456' });

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('nationalId');
    });

    it('searches by name and phone', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedDriver({ name: 'Kamau Driver' });
      await seedDriver({ name: 'Otieno Driver' });

      const response = await request(app).get(`${DRIVERS}?search=Kamau`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Kamau Driver');
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedDriver({ name: 'Active', isActive: true });
      await seedDriver({ name: 'Retired', isActive: false });

      const response = await request(app).get(`${DRIVERS}?isActive=false`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Retired');
    });
  });

  describe('updating', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const driver = await seedDriver({ name: 'Before' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${DRIVERS}/${driver.id}`)
        .set(headers)
        .send({ name: 'After' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('After');
    });

    it('rejects an empty update', async () => {
      const { cookie } = await createSignedInUser('admin');
      const driver = await seedDriver();
      const headers = await csrfHeaders(cookie);

      const response = await request(app).patch(`${DRIVERS}/${driver.id}`).set(headers).send({});

      expect(response.status).toBe(422);
    });

    it('rejects updating onto another driver\'s national ID', async () => {
      await seedDriver({ nationalId: '40011111' });
      const driver = await seedDriver({ nationalId: '40022222' });
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${DRIVERS}/${driver.id}`)
        .set(headers)
        .send({ nationalId: '40011111' });

      expect(response.status).toBe(422);
    });

    it('allows saving a driver under its own unchanged national ID', async () => {
      const driver = await seedDriver({ nationalId: '40033333' });
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${DRIVERS}/${driver.id}`)
        .set(headers)
        .send({ nationalId: '40033333', name: 'Updated Name' });

      expect(response.status).toBe(200);
    });

    it('returns 404 for an unknown driver', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${DRIVERS}/does-not-exist`)
        .set(headers)
        .send({ name: 'Someone' });

      expect(response.status).toBe(404);
    });
  });

  describe('activation', () => {
    it('deactivates and reactivates a driver', async () => {
      const { cookie } = await createSignedInUser('admin');
      const driver = await seedDriver({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app).post(`${DRIVERS}/${driver.id}/deactivate`).set(headers).send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app).post(`${DRIVERS}/${driver.id}/activate`).set(headers).send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('rejects deactivating an already inactive driver', async () => {
      const { cookie } = await createSignedInUser('admin');
      const driver = await seedDriver({ isActive: false });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${DRIVERS}/${driver.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('never deletes the record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const driver = await seedDriver();
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${DRIVERS}/${driver.id}/deactivate`).set(headers).send({});

      expect(await getTestPrisma().driver.findUnique({ where: { id: driver.id } })).not.toBeNull();
    });
  });

  describe('audit', () => {
    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(DRIVERS)
        .set(headers)
        .send({ name: 'Audited', phone: '0722123456', nationalId: '50011111' });

      const audit = await getTestPrisma().auditLog.findFirst({ where: { action: 'CREATE_DRIVER' } });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('drivers');
    });
  });
});
