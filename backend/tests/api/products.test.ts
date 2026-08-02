import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { normalizeForComparison } from '../../src/shared/utils/normalize.js';
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

async function seedProduct(
  overrides: Partial<{ name: string; size: string; isActive: boolean }> = {},
) {
  const name = overrides.name ?? `Test Product ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().product.create({
    data: {
      name: name,
      nameNormalized: normalizeForComparison(name),
      category: 'HOLLOW_BLOCK',
      size: overrides.size ?? '6 × 9',
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('products module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(PRODUCTS);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('lets an accountant read products', async () => {
      const { cookie } = await createSignedInUser('accountant');

      const response = await request(app).get(PRODUCTS).set('Cookie', cookie);

      expect(response.status).toBe(200);
    });

    it('refuses an accountant creating a product', async () => {
      // The approved matrix gives the Accountant read-only access to products.
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Not Allowed', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('refuses an accountant updating a product', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const product = await seedProduct();
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${PRODUCTS}/${product.id}`)
        .set(headers)
        .send({ size: '9 × 9' });

      expect(response.status).toBe(403);
    });

    it('lets an admin create a product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Admin Product', category: 'HOLLOW_POT', size: '380 × 200 × 150 mm' });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .post(PRODUCTS)
        .set('Cookie', cookie)
        .send({ name: 'No CSRF', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      expect(response.status).toBe(403);
    });
  });

  describe('listing', () => {
    it('returns pagination metadata', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Alpha' });
      await seedProduct({ name: 'Beta' });

      const response = await request(app)
        .get(`${PRODUCTS}?page=1&pageSize=10`)
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body.meta).toMatchObject({ page: 1, pageSize: 10, totalRecords: 2 });
    });

    it('searches by name', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Hollow Blocks 6 × 9' });
      await seedProduct({ name: 'Hollow Pot 380' });

      const response = await request(app).get(`${PRODUCTS}?search=Pot`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Hollow Pot 380');
    });

    it('filters by category', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'A block' });
      await getTestPrisma().product.create({
        data: { name: 'A pot', nameNormalized: 'a pot', category: 'HOLLOW_POT', size: '380' },
      });

      const response = await request(app)
        .get(`${PRODUCTS}?category=HOLLOW_POT`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('HOLLOW_POT');
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Active one', isActive: true });
      await seedProduct({ name: 'Retired one', isActive: false });

      const active = await request(app).get(`${PRODUCTS}?isActive=true`).set('Cookie', cookie);
      const inactive = await request(app).get(`${PRODUCTS}?isActive=false`).set('Cookie', cookie);

      expect(active.body.data).toHaveLength(1);
      expect(inactive.body.data).toHaveLength(1);
      expect(inactive.body.data[0].name).toBe('Retired one');
    });

    it('returns both states when no filter is given', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Active one', isActive: true });
      await seedProduct({ name: 'Retired one', isActive: false });

      const response = await request(app).get(PRODUCTS).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('creating', () => {
    it('creates a product and returns it', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(PRODUCTS).set(headers).send({
        name: 'Hollow Blocks 6 × 9',
        category: 'HOLLOW_BLOCK',
        size: '6 × 9',
        description: 'Standard wall block.',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Hollow Blocks 6 × 9',
        category: 'HOLLOW_BLOCK',
        size: '6 × 9',
        isActive: true,
      });
    });

    it('rejects a duplicate name', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Hollow Blocks 6 × 9' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Hollow Blocks 6 × 9', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('rejects a duplicate name differing only by case', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Hollow Blocks 6 × 9' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'hollow blocks 6 × 9', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      expect(response.status).toBe(422);
    });

    it('rejects a missing name', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ category: 'HOLLOW_BLOCK', size: '6 × 9' });

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('name');
    });

    it('rejects an unknown category', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Odd product', category: 'PAVING_SLAB', size: '1' });

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('category');
    });
  });

  describe('products carry no price', () => {
    it('rejects a create that includes a price', async () => {
      // Prices are agreed per transaction and snapshotted on order and
      // invoice items. A price on the product master would eventually be
      // mistaken for the real one.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(PRODUCTS).set(headers).send({
        name: 'Priced product',
        category: 'HOLLOW_BLOCK',
        size: '6 × 9',
        price: 50,
      });

      expect(response.status).toBe(422);
    });

    it('never returns a price field', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Plain product' });

      const response = await request(app).get(PRODUCTS).set('Cookie', cookie);

      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/"price"/i);
      expect(body).not.toMatch(/"unitPrice"/i);
      expect(response.body.data[0]).not.toHaveProperty('price');
    });
  });

  describe('updating', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct({ name: 'Before' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${PRODUCTS}/${product.id}`)
        .set(headers)
        .send({ name: 'After', size: '9 × 9' });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ name: 'After', size: '9 × 9' });
    });

    it('clears the description when null is sent', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await getTestPrisma().product.create({
        data: {
          name: 'Has description',
          nameNormalized: 'has description',
          category: 'HOLLOW_BLOCK',
          size: '6 × 9',
          description: 'x',
        },
      });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${PRODUCTS}/${product.id}`)
        .set(headers)
        .send({ description: null });

      expect(response.body.data.description).toBeNull();
    });

    it('rejects an empty update', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct();
      const headers = await csrfHeaders(cookie);

      const response = await request(app).patch(`${PRODUCTS}/${product.id}`).set(headers).send({});

      expect(response.status).toBe(422);
    });

    it('rejects renaming onto another product', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedProduct({ name: 'Taken' });
      const product = await seedProduct({ name: 'Mine' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${PRODUCTS}/${product.id}`)
        .set(headers)
        .send({ name: 'Taken' });

      expect(response.status).toBe(422);
    });

    it('allows saving a product under its own unchanged name', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct({ name: 'Same name' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${PRODUCTS}/${product.id}`)
        .set(headers)
        .send({ name: 'Same name', size: '4 × 9' });

      expect(response.status).toBe(200);
    });

    it('returns 404 for an unknown product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${PRODUCTS}/does-not-exist`)
        .set(headers)
        .send({ size: '6 × 9' });

      expect(response.status).toBe(404);
    });
  });

  describe('activation', () => {
    it('deactivates and reactivates a product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app)
        .post(`${PRODUCTS}/${product.id}/deactivate`)
        .set(headers)
        .send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app)
        .post(`${PRODUCTS}/${product.id}/activate`)
        .set(headers)
        .send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('rejects deactivating an already inactive product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct({ isActive: false });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${PRODUCTS}/${product.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('never deletes the record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct();
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${PRODUCTS}/${product.id}/deactivate`).set(headers).send({});

      // Past orders and invoices reference products permanently, so a
      // product is retired, never removed.
      expect(
        await getTestPrisma().product.findUnique({ where: { id: product.id } }),
      ).not.toBeNull();
    });
  });

  describe('audit', () => {
    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Audited', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_PRODUCT' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('products');
    });

    it('records before and after values on an update', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct({ name: 'Old name' });
      const headers = await csrfHeaders(cookie);

      await request(app).patch(`${PRODUCTS}/${product.id}`).set(headers).send({ name: 'New name' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'UPDATE_PRODUCT', entityId: product.id },
      });

      expect(audit?.previousData).toMatchObject({ name: 'Old name' });
      expect(audit?.updatedData).toMatchObject({ name: 'New name' });
    });

    it('records activation and deactivation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct({ isActive: true });
      const headers = await csrfHeaders(cookie);

      await request(app).post(`${PRODUCTS}/${product.id}/deactivate`).set(headers).send({});
      await request(app).post(`${PRODUCTS}/${product.id}/activate`).set(headers).send({});

      const actions = await getTestPrisma().auditLog.findMany({
        where: { module: 'products', entityId: product.id },
        select: { action: true },
        orderBy: { createdAt: 'asc' },
      });

      expect(actions.map((row) => row.action)).toEqual(['DEACTIVATE_PRODUCT', 'ACTIVATE_PRODUCT']);
    });
  });
});
