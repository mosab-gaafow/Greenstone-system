import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { normalizeRegistration } from '../../src/modules/vehicles/vehicles.repository.js';
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

/** Standard body for a vehicle create request — every field is required. */
function vehicleBody(overrides: Partial<Record<string, string>> = {}) {
  return {
    registrationNumber: `K${Math.floor(100 + Math.random() * 899)}A`,
    vehicleType: 'Truck',
    truckLengthM: '6.00',
    truckWidthM: '2.00',
    truckHeightM: '1.50',
    ...overrides,
  };
}

async function seedVehicle(
  overrides: Partial<{ registrationNumber: string; isActive: boolean }> = {},
) {
  const registrationNumber =
    overrides.registrationNumber ?? `K${Math.floor(100 + Math.random() * 899)}A`;

  return getTestPrisma().vehicle.create({
    data: {
      registrationNumber,
      registrationNormalized: normalizeRegistration(registrationNumber),
      vehicleType: 'Truck',
      ownershipType: 'HIRED',
      truckLengthM: '6.00',
      truckWidthM: '2.00',
      truckHeightM: '1.50',
      calculationFactor: '1100.00',
      calculatedLoadKg: '19800.00',
      calculatedLoadTonnes: '19.800',
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

      const response = await request(app).post(VEHICLES).set(headers).send(vehicleBody());

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app).post(VEHICLES).set('Cookie', cookie).send(vehicleBody());

      expect(response.status).toBe(403);
    });
  });

  describe('creating and listing', () => {
    it('creates a vehicle as HIRED, decided server-side', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'KDA 123X' }));

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        registrationNumber: 'KDA 123X',
        ownershipType: 'HIRED',
        isActive: true,
      });
    });

    it('rejects an ownershipType field on the request', async () => {
      // Hired-only for the MVP — ownership is never client-controlled.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send({ ...vehicleBody(), ownershipType: 'COMPANY' });

      expect(response.status).toBe(422);
    });

    it('rejects a hireCost field on the request', async () => {
      // hireCost was removed from the Vehicle master entirely.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send({ ...vehicleBody(), hireCost: '15000.00' });

      expect(response.status).toBe(422);
    });

    it('rejects a duplicate registration number differing only by case and spacing', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicle({ registrationNumber: 'KDA 123X' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'kda123x' }));

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedVehicle({ registrationNumber: 'Active One', isActive: true });
      await seedVehicle({ registrationNumber: 'Retired One', isActive: false });

      const response = await request(app).get(`${VEHICLES}?isActive=false`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].registrationNumber).toBe('Retired One');
    });
  });

  describe('truck load calculation', () => {
    it('calculates load from length, width and height', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(
          vehicleBody({
            registrationNumber: 'KDD 111A',
            truckLengthM: '6.00',
            truckWidthM: '2.00',
            truckHeightM: '1.50',
          }),
        );

      expect(response.status).toBe(201);
      // 6 * 2 * 1.5 * 1100 = 19800 kg = 19.8 tonnes
      expect(response.body.data.calculationFactor).toBe('1100.00');
      expect(response.body.data.calculatedLoadKg).toBe('19800.00');
      expect(response.body.data.calculatedLoadTonnes).toBe('19.800');
    });

    it('rejects a missing dimension', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const body = vehicleBody({ registrationNumber: 'KDE 222B' }) as Record<string, unknown>;
      delete body['truckHeightM'];

      const response = await request(app).post(VEHICLES).set(headers).send(body);

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('truckHeightM');
    });

    it('rejects an unrealistic dimension instead of overflowing the database', async () => {
      // A data-entry slip like "600" instead of "6.00" must fail validation
      // with a clear message, not reach the database and overflow the
      // calculated-load column.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(VEHICLES).set(headers).send(
        vehicleBody({
          registrationNumber: 'KDZ 999Z',
          truckLengthM: '600',
          truckWidthM: '200',
          truckHeightM: '150',
        }),
      );

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('truckLengthM');
    });

    it('recalculates when a dimension changes on update', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const created = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'KDG 444D' }));

      const response = await request(app)
        .patch(`${VEHICLES}/${created.body.data.id}`)
        .set(headers)
        .send({ truckHeightM: '2.00' });

      // 6 * 2 * 2 * 1100 = 26400 kg
      expect(response.body.data.calculatedLoadKg).toBe('26400.00');
      expect(response.body.data.calculatedLoadTonnes).toBe('26.400');
    });

    it('does not change a previously saved vehicle when a later vehicle uses different dimensions', async () => {
      // Stands in for "a future factor change must not rewrite old records":
      // each vehicle's snapshot is independent and is never recalculated by
      // anything other than its own create/update call.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const first = await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'KDI 666F' }));

      await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(
          vehicleBody({
            registrationNumber: 'KDJ 777G',
            truckLengthM: '10.00',
            truckWidthM: '2.50',
            truckHeightM: '2.00',
          }),
        );

      const refetched = await request(app)
        .get(`${VEHICLES}/${first.body.data.id}`)
        .set('Cookie', cookie);

      expect(refetched.body.data.calculatedLoadKg).toBe('19800.00');
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

      await request(app)
        .post(VEHICLES)
        .set(headers)
        .send(vehicleBody({ registrationNumber: 'Audited' }));

      const audit = await getTestPrisma().auditLog.findFirst({ where: { action: 'CREATE_VEHICLE' } });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('vehicles');
    });
  });
});
