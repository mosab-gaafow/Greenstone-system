import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const PRODUCTS = `${API_BASE_PATH}/products`;

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

async function seedProduct(overrides: Partial<{ name: string }> = {}) {
  const name = overrides.name ?? `Product ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().product.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      category: 'HOLLOW_BLOCK',
      size: '6 × 9',
      isActive: true,
    },
  });
}

describe('finished stock module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const product = await seedProduct();

      const response = await request(app).get(`${PRODUCTS}/${product.id}/finished-stock`);

      expect(response.status).toBe(401);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct();

      const response = await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set('Cookie', cookie)
        .send({ quantity: 10 });

      expect(response.status).toBe(403);
    });
  });

  describe('reading', () => {
    it('creates a zero balance on first read', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct();

      const response = await request(app)
        .get(`${PRODUCTS}/${product.id}/finished-stock`)
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        physicalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
      });
    });

    it('returns 404 for an unknown product', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .get(`${PRODUCTS}/does-not-exist/finished-stock`)
        .set('Cookie', cookie);

      expect(response.status).toBe(404);
    });
  });

  describe('opening and adjustments', () => {
    it('sets the opening quantity and records a movement', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: 500, reason: 'Production setup' });

      expect(response.status).toBe(200);
      expect(response.body.data.physicalQuantity).toBe(500);
      expect(response.body.data.availableQuantity).toBe(500);

      const movement = await getTestPrisma().finishedStockMovement.findFirst({
        where: { productId: product.id },
      });
      expect(movement?.movementType).toBe('OPENING');
      expect(movement?.quantity).toBe(500);
      expect(movement?.createdByUserId).toBe(user.id);
    });

    it('rejects a negative opening quantity', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: -1 });

      expect(response.status).toBe(422);
    });

    it('applies a signed adjustment with a required reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: 100 });

      const response = await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/adjust`)
        .set(headers)
        .send({ quantity: -15, reason: 'Stock count correction.' });

      expect(response.status).toBe(200);
      expect(response.body.data.physicalQuantity).toBe(85);
    });

    it('rejects an adjustment with no reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/adjust`)
        .set(headers)
        .send({ quantity: 5 });

      expect(response.status).toBe(422);
    });

    it('rejects an adjustment that would take physical stock below zero', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: 10 });

      const response = await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/adjust`)
        .set(headers)
        .send({ quantity: -50, reason: 'Too much removed.' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INSUFFICIENT_FINISHED_STOCK');
    });

    it('gives every concurrent adjustment a correct final balance', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: 0 });

      const responses = await Promise.all(
        Array.from({ length: 8 }, () =>
          request(app)
            .post(`${PRODUCTS}/${product.id}/finished-stock/adjust`)
            .set(headers)
            .send({ quantity: 12, reason: 'Concurrent production release.' }),
        ),
      );

      expect(responses.every((response) => response.status === 200)).toBe(true);

      const balance = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(balance?.physicalQuantity).toBe(96);
    });

    it('lists movements newest first', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: 50 });
      await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/adjust`)
        .set(headers)
        .send({ quantity: -5, reason: 'Broke during handling.' });

      const response = await request(app)
        .get(`${PRODUCTS}/${product.id}/finished-stock/movements`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].movementType).toBe('NEGATIVE_ADJUSTMENT');
      expect(response.body.data[1].movementType).toBe('OPENING');
    });
  });
});
