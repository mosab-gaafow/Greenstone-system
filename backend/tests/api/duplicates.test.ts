import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, truncateAll } from '../setup/test-database.js';

/**
 * Duplicate prevention.
 *
 * A unique index on the raw value is not enough. "0722 123 456" and
 * "0722123456" are the same phone number, and "6 x 9" and "6 × 9" are the same
 * product, but they are different strings — so a duplicate could be created
 * simply by typing a space.
 *
 * Every case below is a way someone could sidestep a naive uniqueness rule.
 */

const app = createApp();
const CUSTOMERS = `${API_BASE_PATH}/customers`;
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

describe('duplicate prevention', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('customers cannot be entered twice', () => {
    it('rejects the exact same customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const body = { name: 'Ahmed', phone: '0707499936' };

      expect((await request(app).post(CUSTOMERS).set(headers).send(body)).status).toBe(201);

      const second = await request(app).post(CUSTOMERS).set(headers).send(body);

      expect(second.status).toBe(422);
      expect(second.body.error.message).toMatch(/phone number already belongs to Ahmed/i);
    });

    it('rejects the same number written with spaces', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Alpha Builders', phone: '0722123456' });

      const second = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Beta Contractors', phone: '0722 123 456' });

      expect(second.status).toBe(422);
    });

    it('rejects the same number written with hyphens', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Alpha Builders', phone: '0722123456' });

      const second = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Beta Contractors', phone: '0722-123-456' });

      expect(second.status).toBe(422);
    });

    it('rejects the same number in international form', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Alpha Builders', phone: '0722123456' });

      const second = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Beta Contractors', phone: '+254722123456' });

      expect(second.status).toBe(422);
    });

    it('rejects a duplicate email regardless of case', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Alpha Builders', phone: '0722111111', email: 'kamau@example.com' });

      const second = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Beta Contractors', phone: '0722222222', email: 'KAMAU@Example.COM' });

      expect(second.status).toBe(422);
      expect(second.body.error.message).toMatch(/email address already belongs/i);
    });

    it('allows many customers with no email', async () => {
      // A unique index must not stop several customers simply having no email.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const first = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Alpha Builders', phone: '0722111111' });
      const second = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Beta Contractors', phone: '0722222222' });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
    });

    it('lets a customer keep its own number while being edited', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const created = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Kamau', phone: '0722123456' });

      const updated = await request(app)
        .patch(`${CUSTOMERS}/${created.body.data.id as string}`)
        .set(headers)
        .send({ name: 'Kamau Contractors', phone: '0722123456' });

      expect(updated.status).toBe(200);
    });

    it('rejects editing a customer onto another customer number', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Alpha Builders', phone: '0722111111' });
      const second = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Beta Contractors', phone: '0722222222' });

      const response = await request(app)
        .patch(`${CUSTOMERS}/${second.body.data.id as string}`)
        .set(headers)
        .send({ phone: '0722 111 111' });

      expect(response.status).toBe(422);
    });

    it('collapses repeated spaces in a name', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Kamau    Contractors', phone: '0722123456' });

      expect(response.body.data.name).toBe('Kamau Contractors');
    });
  });

  describe('products cannot be entered twice', () => {
    it('rejects the same name in different case', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Hollow Blocks 6 × 9', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      const second = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'hollow blocks 6 × 9', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      expect(second.status).toBe(422);
    });

    it('treats the multiplication sign and the letter x as the same', async () => {
      // "6 × 9" and "6 x 9" are the same product to anyone reading them.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Hollow Blocks 6 × 9', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      const second = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Hollow Blocks 6 x 9', category: 'HOLLOW_BLOCK', size: '6 x 9' });

      expect(second.status).toBe(422);
    });

    it('rejects the same name with extra spaces', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Hollow Pot 380', category: 'HOLLOW_POT', size: '380' });

      const second = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Hollow   Pot    380', category: 'HOLLOW_POT', size: '380' });

      expect(second.status).toBe(422);
    });

    it('rejects renaming a product onto another one', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'Taken name', category: 'HOLLOW_BLOCK', size: '6 × 9' });
      const mine = await request(app)
        .post(PRODUCTS)
        .set(headers)
        .send({ name: 'My name', category: 'HOLLOW_BLOCK', size: '6 × 9' });

      const response = await request(app)
        .patch(`${PRODUCTS}/${mine.body.data.id as string}`)
        .set(headers)
        .send({ name: 'taken  NAME' });

      expect(response.status).toBe(422);
    });
  });

  describe('site names cannot be entered twice for one customer', () => {
    it('rejects the same site name in different case', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const customer = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Kamau', phone: '0722123456' });
      const id = customer.body.data.id as string;

      await request(app)
        .post(`${CUSTOMERS}/${id}/addresses`)
        .set(headers)
        .send({ label: 'Kiambu Road site', addressLine: 'Plot 44' });

      const second = await request(app)
        .post(`${CUSTOMERS}/${id}/addresses`)
        .set(headers)
        .send({ label: 'kiambu road SITE', addressLine: 'Plot 45' });

      expect(second.status).toBe(422);
    });

    it('still allows two customers to use the same site name', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const first = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Alpha Builders', phone: '0722111111' });
      const second = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Beta Contractors', phone: '0722222222' });

      await request(app)
        .post(`${CUSTOMERS}/${first.body.data.id as string}/addresses`)
        .set(headers)
        .send({ label: 'Main site', addressLine: 'Plot 1' });

      const response = await request(app)
        .post(`${CUSTOMERS}/${second.body.data.id as string}/addresses`)
        .set(headers)
        .send({ label: 'Main site', addressLine: 'Plot 2' });

      expect(response.status).toBe(201);
    });
  });
});
