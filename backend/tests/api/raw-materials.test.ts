import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const RAW_MATERIALS = `${API_BASE_PATH}/raw-materials`;

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

async function seedRawMaterial(
  overrides: Partial<{ name: string; isActive: boolean; measurementUnitId: string }> = {},
) {
  const name = overrides.name ?? `Material ${Math.random().toString(36).slice(2, 8)}`;
  const measurementUnitId = overrides.measurementUnitId ?? (await seedUnit()).id;

  return getTestPrisma().rawMaterial.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      measurementUnitId,
      isActive: overrides.isActive ?? true,
      stockBalance: { create: { quantity: 0 } },
    },
  });
}

describe('raw materials module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(RAW_MATERIALS);

      expect(response.status).toBe(401);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const unit = await seedUnit();

      const response = await request(app)
        .post(RAW_MATERIALS)
        .set('Cookie', cookie)
        .send({ name: 'Cement', measurementUnitId: unit.id });

      expect(response.status).toBe(403);
    });
  });

  describe('creating', () => {
    it('creates a raw material and its zero-balance stock row', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const unit = await seedUnit({ name: 'Bag' });

      const response = await request(app)
        .post(RAW_MATERIALS)
        .set(headers)
        .send({ name: 'Cement', measurementUnitId: unit.id, reorderLevel: '50.000' });

      expect(response.status).toBe(201);
      expect(response.body.data.measurementUnitName).toBe('Bag');
      expect(response.body.data.reorderLevel).toBe('50.000');

      const balance = await getTestPrisma().rawMaterialStockBalance.findUnique({
        where: { rawMaterialId: response.body.data.id as string },
      });
      expect(balance?.quantity.toFixed(3)).toBe('0.000');
    });

    it('rejects a duplicate name', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const unit = await seedUnit();

      await request(app).post(RAW_MATERIALS).set(headers).send({ name: 'Dust', measurementUnitId: unit.id });
      const second = await request(app)
        .post(RAW_MATERIALS)
        .set(headers)
        .send({ name: 'dust', measurementUnitId: unit.id });

      expect(second.status).toBe(422);
    });

    it('rejects an inactive measurement unit', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const unit = await seedUnit({ isActive: false });

      const response = await request(app)
        .post(RAW_MATERIALS)
        .set(headers)
        .send({ name: 'Pumice', measurementUnitId: unit.id });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });
  });

  describe('stock: opening and adjustments', () => {
    it('sets the opening quantity and records a movement', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      const response = await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/opening`)
        .set(headers)
        .send({ quantity: '1000.500', reason: 'Production setup' });

      expect(response.status).toBe(200);
      expect(response.body.data.quantity).toBe('1000.500');

      const movement = await getTestPrisma().rawMaterialMovement.findFirst({
        where: { rawMaterialId: material.id },
      });
      expect(movement?.movementType).toBe('OPENING');
      expect(movement?.quantity.toFixed(3)).toBe('1000.500');
      expect(movement?.createdByUserId).toBe(user.id);

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'SET_RAW_MATERIAL_OPENING_STOCK' },
      });
      expect(audit?.module).toBe('raw-materials');
    });

    it('rejects a negative opening quantity', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      const response = await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/opening`)
        .set(headers)
        .send({ quantity: '-5' });

      expect(response.status).toBe(422);
    });

    it('applies a positive adjustment with a required reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/opening`)
        .set(headers)
        .send({ quantity: '100' });

      const response = await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/adjust`)
        .set(headers)
        .send({ quantity: '25.5', reason: 'Found extra bags during stock take.' });

      expect(response.status).toBe(200);
      expect(response.body.data.quantity).toBe('125.500');

      const movement = await getTestPrisma().rawMaterialMovement.findFirst({
        where: { rawMaterialId: material.id, movementType: 'POSITIVE_ADJUSTMENT' },
      });
      expect(movement?.quantity.toFixed(3)).toBe('25.500');
    });

    it('rejects an adjustment with no reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      const response = await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/adjust`)
        .set(headers)
        .send({ quantity: '10' });

      expect(response.status).toBe(422);
    });

    it('rejects a negative adjustment that would take stock below zero', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/opening`)
        .set(headers)
        .send({ quantity: '10' });

      const response = await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/adjust`)
        .set(headers)
        .send({ quantity: '-50', reason: 'Too much taken out.' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INSUFFICIENT_RAW_MATERIAL');

      const balance = await getTestPrisma().rawMaterialStockBalance.findUnique({
        where: { rawMaterialId: material.id },
      });
      expect(balance?.quantity.toFixed(3)).toBe('10.000');
    });

    it('lists movements newest first', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/opening`)
        .set(headers)
        .send({ quantity: '100' });
      await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/adjust`)
        .set(headers)
        .send({ quantity: '-10', reason: 'Used in a test batch.' });

      const response = await request(app)
        .get(`${RAW_MATERIALS}/${material.id}/stock/movements`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].movementType).toBe('NEGATIVE_ADJUSTMENT');
      expect(response.body.data[1].movementType).toBe('OPENING');
    });

    it('gives every concurrent adjustment a correct final balance', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      await request(app)
        .post(`${RAW_MATERIALS}/${material.id}/stock/opening`)
        .set(headers)
        .send({ quantity: '0' });

      const responses = await Promise.all(
        Array.from({ length: 8 }, () =>
          request(app)
            .post(`${RAW_MATERIALS}/${material.id}/stock/adjust`)
            .set(headers)
            .send({ quantity: '10', reason: 'Concurrent restock.' }),
        ),
      );

      expect(responses.every((response) => response.status === 200)).toBe(true);

      const balance = await getTestPrisma().rawMaterialStockBalance.findUnique({
        where: { rawMaterialId: material.id },
      });
      expect(balance?.quantity.toFixed(3)).toBe('80.000');
      expect(balance?.version).toBe(9);
    });
  });

  describe('no permanent deletion', () => {
    it('exposes no delete route', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const material = await seedRawMaterial();

      const response = await request(app).delete(`${RAW_MATERIALS}/${material.id}`).set(headers);

      expect(response.status).toBe(404);
      expect(
        await getTestPrisma().rawMaterial.findUnique({ where: { id: material.id } }),
      ).not.toBeNull();
    });
  });
});
