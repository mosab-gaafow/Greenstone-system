import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const UNITS = `${API_BASE_PATH}/measurement-units`;

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

async function seedUnit(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const name = overrides.name ?? `Unit ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().measurementUnit.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('measurement units module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(UNITS);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('lets an accountant read measurement units', async () => {
      const { cookie } = await createSignedInUser('accountant');

      const response = await request(app).get(UNITS).set('Cookie', cookie);

      expect(response.status).toBe(200);
    });

    it('refuses an accountant creating a unit', async () => {
      // The approved matrix gives the Accountant read-only access to units,
      // the same as products — see permissions.ts.
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(UNITS).set(headers).send({ name: 'Bag' });

      expect(response.status).toBe(403);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .post(UNITS)
        .set('Cookie', cookie)
        .send({ name: 'No CSRF' });

      expect(response.status).toBe(403);
    });
  });

  describe('creating', () => {
    it('creates a unit with an optional symbol', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(UNITS)
        .set(headers)
        .send({ name: 'Kilogram', symbol: 'kg' });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({ name: 'Kilogram', symbol: 'kg', isActive: true });
    });

    it('rejects a duplicate name regardless of case or spacing', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app).post(UNITS).set(headers).send({ name: 'Tonne' });
      const second = await request(app).post(UNITS).set(headers).send({ name: ' tonne ' });

      expect(second.status).toBe(422);
    });
  });

  describe('updating', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const unit = await seedUnit({ name: 'Before' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${UNITS}/${unit.id}`)
        .set(headers)
        .send({ name: 'After', symbol: 'af' });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ name: 'After', symbol: 'af' });
    });

    it('returns 404 for an unknown unit', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${UNITS}/does-not-exist`)
        .set(headers)
        .send({ name: 'Something' });

      expect(response.status).toBe(404);
    });
  });

  describe('activation', () => {
    it('deactivates and reactivates a unit', async () => {
      const { cookie } = await createSignedInUser('admin');
      const unit = await seedUnit({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app).post(`${UNITS}/${unit.id}/deactivate`).set(headers).send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app).post(`${UNITS}/${unit.id}/activate`).set(headers).send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('never deletes the record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const unit = await seedUnit();
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${UNITS}/${unit.id}/deactivate`).set(headers).send({});

      expect(
        await getTestPrisma().measurementUnit.findUnique({ where: { id: unit.id } }),
      ).not.toBeNull();
    });
  });

  describe('audit', () => {
    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app).post(UNITS).set(headers).send({ name: 'Cubic metre' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_MEASUREMENT_UNIT' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('measurement-units');
    });
  });
});
