import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { normalizeNationalId, normalizePhone } from '../../src/shared/utils/normalize.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const VEHICLE_OWNERS = `${API_BASE_PATH}/vehicle-owners`;

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

async function seedVehicleOwner(
  overrides: Partial<{
    name: string;
    phone: string;
    nationalId: string | null;
    isActive: boolean;
  }> = {},
) {
  const phone = overrides.phone ?? `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;
  const nationalId = overrides.nationalId ?? null;

  return getTestPrisma().vehicleOwner.create({
    data: {
      name: overrides.name ?? `Vehicle Owner ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      nationalId,
      nationalIdNormalized: nationalId ? normalizeNationalId(nationalId) : null,
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('vehicle owners module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(VEHICLE_OWNERS);
      expect(response.status).toBe(401);
    });

    it('lets an accountant create a vehicle owner', async () => {
      // The approved matrix gives the Accountant full vehicle-owner management,
      // matching driver/vehicle.
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'Kamau Transporters', phone: '0722123456' });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set('Cookie', cookie)
        .send({ name: 'No CSRF', phone: '0722123456' });

      expect(response.status).toBe(403);
    });
  });

  describe('creating and listing', () => {
    it('creates a vehicle owner with a national ID', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'Otieno Haulage', phone: '0722123456', nationalId: '20011124' });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Otieno Haulage',
        phone: '0722123456',
        nationalId: '20011124',
        isActive: true,
      });
    });

    it('creates a vehicle owner with no national ID', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'No ID Transporters', phone: '0722123457' });

      expect(response.status).toBe(201);
      expect(response.body.data.nationalId).toBeNull();
    });

    it('rejects a duplicate phone', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicleOwner({ phone: '0733111222' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'Someone Else', phone: '0733111222' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('rejects a duplicate phone in a different written form', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicleOwner({ phone: '0733111222' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'Someone Else', phone: '+254733111222' });

      expect(response.status).toBe(422);
    });

    it('rejects a duplicate national ID when both provide one', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicleOwner({ nationalId: '30012345' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'Someone Else', phone: '0733999888', nationalId: '30012345' });

      expect(response.status).toBe(422);
    });

    it('allows several vehicle owners with no national ID', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicleOwner({ nationalId: null });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'Another Without ID', phone: '0733999889' });

      expect(response.status).toBe(201);
    });

    it('rejects a missing phone', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'No Phone' });

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('phone');
    });

    it('searches by name and phone', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicleOwner({ name: 'Kamau Transporters' });
      await seedVehicleOwner({ name: 'Otieno Haulage' });

      const response = await request(app)
        .get(`${VEHICLE_OWNERS}?search=Kamau`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Kamau Transporters');
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicleOwner({ name: 'Active', isActive: true });
      await seedVehicleOwner({ name: 'Retired', isActive: false });

      const response = await request(app)
        .get(`${VEHICLE_OWNERS}?isActive=false`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Retired');
    });
  });

  describe('updating', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner({ name: 'Before' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${VEHICLE_OWNERS}/${owner.id}`)
        .set(headers)
        .send({ name: 'After' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('After');
    });

    it('clears the national ID when null is sent', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner({ nationalId: '40099999' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${VEHICLE_OWNERS}/${owner.id}`)
        .set(headers)
        .send({ nationalId: null });

      expect(response.body.data.nationalId).toBeNull();
    });

    it('rejects an empty update', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner();
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${VEHICLE_OWNERS}/${owner.id}`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it("rejects updating onto another owner's phone", async () => {
      await seedVehicleOwner({ phone: '0740011111' });
      const owner = await seedVehicleOwner({ phone: '0740022222' });
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${VEHICLE_OWNERS}/${owner.id}`)
        .set(headers)
        .send({ phone: '0740011111' });

      expect(response.status).toBe(422);
    });

    it('allows saving a vehicle owner under its own unchanged phone', async () => {
      const owner = await seedVehicleOwner({ phone: '0740033333' });
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${VEHICLE_OWNERS}/${owner.id}`)
        .set(headers)
        .send({ phone: '0740033333', name: 'Updated Name' });

      expect(response.status).toBe(200);
    });

    it('returns 404 for an unknown vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${VEHICLE_OWNERS}/does-not-exist`)
        .set(headers)
        .send({ name: 'Someone' });

      expect(response.status).toBe(404);
    });
  });

  describe('activation', () => {
    it('deactivates and reactivates a vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app)
        .post(`${VEHICLE_OWNERS}/${owner.id}/deactivate`)
        .set(headers)
        .send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app)
        .post(`${VEHICLE_OWNERS}/${owner.id}/activate`)
        .set(headers)
        .send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('rejects deactivating an already inactive vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner({ isActive: false });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${VEHICLE_OWNERS}/${owner.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('never deletes the record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner();
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${VEHICLE_OWNERS}/${owner.id}/deactivate`).set(headers).send({});

      expect(
        await getTestPrisma().vehicleOwner.findUnique({ where: { id: owner.id } }),
      ).not.toBeNull();
    });
  });

  describe('audit', () => {
    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(VEHICLE_OWNERS)
        .set(headers)
        .send({ name: 'Audited', phone: '0722123456' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_VEHICLE_OWNER' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('vehicle-owners');
    });
  });
});
