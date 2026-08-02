import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const BROKEN_PRODUCTS = `${API_BASE_PATH}/broken-products`;
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

describe('broken products module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(BROKEN_PRODUCTS);

      expect(response.status).toBe(401);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct();

      const response = await request(app)
        .post(BROKEN_PRODUCTS)
        .set('Cookie', cookie)
        .send({ productId: product.id, quantity: 1, stage: 'FINISHED_STOCK' });

      expect(response.status).toBe(403);
    });
  });

  describe('recording at the FINISHED_STOCK stage', () => {
    it('records the break and decrements physical finished stock', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: 100 });

      const response = await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({
          productId: product.id,
          quantity: 4,
          stage: 'FINISHED_STOCK',
          reason: 'Damaged during a stock count.',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        productId: product.id,
        productName: product.name,
        quantity: 4,
        stage: 'FINISHED_STOCK',
        recordedByUserId: user.id,
      });

      const balance = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(balance?.physicalQuantity).toBe(96);
      expect(balance?.availableQuantity).toBe(96);

      const movement = await getTestPrisma().finishedStockMovement.findFirst({
        where: { productId: product.id, movementType: 'BROKEN' },
      });
      expect(movement?.quantity).toBe(-4);
      expect(movement?.relatedEntityId).toBe(response.body.data.id as string);

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_BROKEN_PRODUCT_RECORD' },
      });
      expect(audit?.module).toBe('broken-products');
    });

    it('rejects recording more breakage than physical stock available', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      await request(app)
        .post(`${PRODUCTS}/${product.id}/finished-stock/opening`)
        .set(headers)
        .send({ quantity: 5 });

      const response = await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({ productId: product.id, quantity: 10, stage: 'FINISHED_STOCK' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INSUFFICIENT_FINISHED_STOCK');

      const balance = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(balance?.physicalQuantity).toBe(5);
    });
  });

  describe('recording at other stages', () => {
    it('records a PRODUCTION-stage break without touching finished stock', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({ productId: product.id, quantity: 3, stage: 'PRODUCTION' });

      expect(response.status).toBe(201);

      const movements = await getTestPrisma().finishedStockMovement.count({
        where: { productId: product.id },
      });
      expect(movements).toBe(0);
    });
  });

  describe('validation', () => {
    it('rejects a zero quantity', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({ productId: product.id, quantity: 0, stage: 'CURING' });

      expect(response.status).toBe(422);
    });

    it('rejects an unknown product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({ productId: 'does-not-exist', quantity: 1, stage: 'CURING' });

      expect(response.status).toBe(404);
    });
  });

  describe('listing', () => {
    it('filters by product and stage', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const productA = await seedProduct({ name: 'Product A' });
      const productB = await seedProduct({ name: 'Product B' });

      await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({ productId: productA.id, quantity: 1, stage: 'CURING' });
      await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({ productId: productB.id, quantity: 2, stage: 'DELIVERY' });

      const response = await request(app)
        .get(`${BROKEN_PRODUCTS}?productId=${productA.id}`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].productId).toBe(productA.id);
    });
  });

  describe('no update or delete route', () => {
    it('exposes neither', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const created = await request(app)
        .post(BROKEN_PRODUCTS)
        .set(headers)
        .send({ productId: product.id, quantity: 1, stage: 'CURING' });

      const patchResponse = await request(app)
        .patch(`${BROKEN_PRODUCTS}/${created.body.data.id}`)
        .set(headers)
        .send({ quantity: 2 });
      const deleteResponse = await request(app)
        .delete(`${BROKEN_PRODUCTS}/${created.body.data.id}`)
        .set(headers);

      expect(patchResponse.status).toBe(404);
      expect(deleteResponse.status).toBe(404);
    });
  });
});
