import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { normalizePhone, normalizeRegistration } from '../../src/shared/utils/normalize.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const VEHICLES = `${API_BASE_PATH}/vehicles`;

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

async function seedVehicleOwner(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().vehicleOwner.create({
    data: {
      name: overrides.name ?? `Vehicle Owner ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: overrides.isActive ?? true,
    },
  });
}

/** Standard body for a vehicle create request — every field is required. */
function vehicleBody(overrides: Partial<Record<string, string>> = {}) {
  return {
    registrationNumber: `K${Math.floor(100 + Math.random() * 899)}A`,
    vehicleType: 'Truck',
    ...overrides,
  };
}

async function seedVehicle(
  overrides: Partial<{ registrationNumber: string; isActive: boolean; vehicleOwnerId: string }> = {},
) {
  const registrationNumber =
    overrides.registrationNumber ?? `K${Math.floor(100 + Math.random() * 899)}A`;
  const vehicleOwnerId = overrides.vehicleOwnerId ?? (await seedVehicleOwner()).id;

  return getTestPrisma().vehicle.create({
    data: {
      registrationNumber,
      registrationNormalized: normalizeRegistration(registrationNumber),
      vehicleType: 'Truck',
      vehicleOwnerId,
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('vehicles module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(VEHICLES);
      expect(response.status).toBe(401);
    });

    it('lets an accountant create a vehicle', async () => {
      // The approved matrix gives the Accountant full vehicle management.
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ vehicleOwnerId: owner.id }));

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set('Cookie', cookie)
        .send(vehicleBody({ vehicleOwnerId: owner.id }));

      expect(response.status).toBe(403);
    });
  });

  describe('creating and listing', () => {
    it('creates a vehicle with a registered, active owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner({ name: 'Kamau Transporters' });

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'KDA 123X', vehicleOwnerId: owner.id }));

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        registrationNumber: 'KDA 123X',
        vehicleOwnerId: owner.id,
        vehicleOwnerName: 'Kamau Transporters',
        isActive: true,
      });
    });

    it('rejects an unknown vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ vehicleOwnerId: 'does-not-exist' }));

      expect(response.status).toBe(404);
    });

    it('rejects an inactive vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner({ isActive: false });

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ vehicleOwnerId: owner.id }));

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });

    it('rejects a missing vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const body = vehicleBody() as Record<string, unknown>;

      const response = await request(app).post(VEHICLES).set(headers).send(body);

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('vehicleOwnerId');
    });

    it('rejects an ownershipType field on the request', async () => {
      // Removed entirely in Phase 6F — no ownership category exists any more.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send({ ...vehicleBody({ vehicleOwnerId: owner.id }), ownershipType: 'COMPANY' });

      expect(response.status).toBe(422);
    });

    it('rejects truck dimension fields on the request', async () => {
      // The Phase 4C volumetric calculation was removed entirely in Phase 6F.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send({
          ...vehicleBody({ vehicleOwnerId: owner.id }),
          truckLengthM: '6.00',
          truckWidthM: '2.00',
          truckHeightM: '1.50',
        });

      expect(response.status).toBe(422);
    });

    it('rejects a duplicate registration number differing only by case and spacing', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicle({ registrationNumber: 'KDA 123X' });
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'kda123x', vehicleOwnerId: owner.id }));

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('rejects a duplicate registration number when the second entry uses hyphens (KDM 293E, then kdm-293e)', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicle({ registrationNumber: 'KDM 293E' });
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'kdm-293e', vehicleOwnerId: owner.id }));

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('rejects a duplicate registration number with mixed hyphen and space separators (KDM 293E, then KDM-293 E)', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicle({ registrationNumber: 'KDM 293E' });
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'KDM-293 E', vehicleOwnerId: owner.id }));

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('creates a vehicle with a normal registration number and stores a clean display value', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'kdm-293e', vehicleOwnerId: owner.id }));

      expect(response.status).toBe(201);
      expect(response.body.data.registrationNumber).toBe('KDM 293E');
    });

    it('rejects a duplicate registration number at the database level, bypassing the service check', async () => {
      const vehicle = await seedVehicle({ registrationNumber: 'KDN 555F' });
      const owner = await seedVehicleOwner();

      await expect(
        getTestPrisma().vehicle.create({
          data: {
            registrationNumber: 'kdn-555f',
            registrationNormalized: normalizeRegistration('kdn-555f'),
            vehicleType: 'Truck',
            vehicleOwnerId: owner.id,
          },
        }),
      ).rejects.toThrow();

      // The original row is untouched — nothing was silently merged or dropped.
      const stillThere = await getTestPrisma().vehicle.findUnique({ where: { id: vehicle.id } });
      expect(stillThere).not.toBeNull();
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicle({ registrationNumber: 'Active One', isActive: true });
      await seedVehicle({ registrationNumber: 'Retired One', isActive: false });

      const response = await request(app).get(`${VEHICLES}?isActive=false`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].registrationNumber).toBe('Retired One');
    });

    it('searches by owner name', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedVehicleOwner({ name: 'Otieno Haulage' });
      await seedVehicle({ registrationNumber: 'KDF 333C', vehicleOwnerId: owner.id });
      await seedVehicle({ registrationNumber: 'KDG 444D' });

      const response = await request(app)
        .get(`${VEHICLES}?search=Otieno`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].registrationNumber).toBe('KDF 333C');
    });
  });

  describe('updating', () => {
    it('changes the vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const firstOwner = await seedVehicleOwner({ name: 'First Owner' });
      const secondOwner = await seedVehicleOwner({ name: 'Second Owner' });
      const vehicle = await seedVehicle({ vehicleOwnerId: firstOwner.id });

      const response = await request(app)
        .patch(`${VEHICLES}/${vehicle.id}`)
        .set(headers)
        .send({ vehicleOwnerId: secondOwner.id });

      expect(response.status).toBe(200);
      expect(response.body.data.vehicleOwnerId).toBe(secondOwner.id);
      expect(response.body.data.vehicleOwnerName).toBe('Second Owner');
    });

    it('rejects changing to an inactive vehicle owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const activeOwner = await seedVehicleOwner();
      const inactiveOwner = await seedVehicleOwner({ isActive: false });
      const vehicle = await seedVehicle({ vehicleOwnerId: activeOwner.id });

      const response = await request(app)
        .patch(`${VEHICLES}/${vehicle.id}`)
        .set(headers)
        .send({ vehicleOwnerId: inactiveOwner.id });

      expect(response.status).toBe(422);
    });

    it('allows saving a vehicle under its own unchanged owner', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();
      const vehicle = await seedVehicle({ vehicleOwnerId: owner.id });

      const response = await request(app)
        .patch(`${VEHICLES}/${vehicle.id}`)
        .set(headers)
        .send({ vehicleOwnerId: owner.id, vehicleType: 'Updated type' });

      expect(response.status).toBe(200);
    });

    it('returns 404 for an unknown vehicle', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${VEHICLES}/does-not-exist`)
        .set(headers)
        .send({ vehicleType: 'Truck' });

      expect(response.status).toBe(404);
    });

    it('rejects an update that would turn one vehicle into another vehicle\'s normalized registration number', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      await seedVehicle({ registrationNumber: 'KDM 293E' });
      const other = await seedVehicle({ registrationNumber: 'KDP 111G' });

      const response = await request(app)
        .patch(`${VEHICLES}/${other.id}`)
        .set(headers)
        .send({ registrationNumber: 'kdm-293e' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('allows a vehicle to update without changing its own registration number, even re-typed in a different format', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const vehicle = await seedVehicle({ registrationNumber: 'KDM 293E' });

      const response = await request(app)
        .patch(`${VEHICLES}/${vehicle.id}`)
        .set(headers)
        .send({ registrationNumber: 'kdm-293e' });

      expect(response.status).toBe(200);
      expect(response.body.data.registrationNumber).toBe('KDM 293E');
    });
  });

  describe('activation', () => {
    it('deactivates and reactivates a vehicle', async () => {
      const { cookie } = await createSignedInUser('admin');
      const vehicle = await seedVehicle({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app)
        .post(`${VEHICLES}/${vehicle.id}/deactivate`)
        .set(headers)
        .send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app).post(`${VEHICLES}/${vehicle.id}/activate`).set(headers).send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('never deletes the record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const vehicle = await seedVehicle();
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${VEHICLES}/${vehicle.id}/deactivate`).set(headers).send({});

      expect(await getTestPrisma().vehicle.findUnique({ where: { id: vehicle.id } })).not.toBeNull();
    });
  });

  describe('audit', () => {
    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const owner = await seedVehicleOwner();

      await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'Audited', vehicleOwnerId: owner.id }));

      const audit = await getTestPrisma().auditLog.findFirst({ where: { action: 'CREATE_VEHICLE' } });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('vehicles');
    });
  });
});
