import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { normalizePhone } from '../../src/shared/utils/normalize.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const CUSTOMERS = `${API_BASE_PATH}/customers`;

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

async function seedCustomer(
  overrides: Partial<{ name: string; phone: string; isActive: boolean }> = {},
) {
  const phone = overrides.phone ?? `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().customer.create({
    data: {
      name: overrides.name ?? `Customer ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('customers module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(CUSTOMERS);
      expect(response.status).toBe(401);
    });

    it('lets an accountant create a customer', async () => {
      // The approved matrix gives the Accountant full customer management.
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Kamau Contractors', phone: '0722123456' });

      expect(response.status).toBe(201);
    });

    it('lets an accountant manage addresses', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const customer = await seedCustomer();
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Kiambu Road site', addressLine: 'Plot 44, Kiambu Road' });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .post(CUSTOMERS)
        .set('Cookie', cookie)
        .send({ name: 'No CSRF', phone: '0722123456' });

      expect(response.status).toBe(403);
    });
  });

  describe('creating and listing', () => {
    it('creates a customer with no addresses', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Kamau Contractors', phone: '0722123456', email: 'kamau@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Kamau Contractors',
        phone: '0722123456',
        email: 'kamau@example.com',
        isActive: true,
        addressCount: 0,
      });
      expect(response.body.data.addresses).toEqual([]);
    });

    it('accepts a customer without an email', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'No Email Ltd', phone: '0733111222' });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBeNull();
    });

    it('accepts the phone formats staff actually type', async () => {
      // Four different lines, each written a different way. The *same* line in
      // several formats is a duplicate, which duplicates.test.ts covers.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      for (const phone of ['0722123456', '+254733222333', '0700 444 555', '0711-666-777']) {
        const response = await request(app)
          .post(CUSTOMERS)
          .set(headers)
          .send({ name: `Customer ${phone}`, phone });

        expect(response.status).toBe(201);
      }
    });

    it('rejects a phone number containing letters', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Bad Phone', phone: 'call me' });

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('phone');
    });

    it('rejects an invalid email', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Bad Email', phone: '0722123456', email: 'not-an-email' });

      expect(response.status).toBe(422);
    });

    it('searches by name, phone and email', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedCustomer({ name: 'Kamau Contractors', phone: '0722123456' });
      await seedCustomer({ name: 'Otieno Builders', phone: '0733999888' });

      const byName = await request(app).get(`${CUSTOMERS}?search=Kamau`).set('Cookie', cookie);
      const byPhone = await request(app).get(`${CUSTOMERS}?search=0733`).set('Cookie', cookie);

      expect(byName.body.data).toHaveLength(1);
      expect(byPhone.body.data[0].name).toBe('Otieno Builders');
    });

    it('filters by active state', async () => {
      const { cookie } = await createSignedInUser('admin');
      await seedCustomer({ name: 'Active', isActive: true });
      await seedCustomer({ name: 'Retired', isActive: false });

      const response = await request(app).get(`${CUSTOMERS}?isActive=false`).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Retired');
    });

    it('counts only active addresses in the list', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      await getTestPrisma().customerAddress.createMany({
        data: [
          {
            customerId: customer.id,
            label: 'Site A',
            labelNormalized: 'site a',
            addressLine: 'Plot 1, Ngong Road',
            isActive: true,
          },
          {
            customerId: customer.id,
            label: 'Site B',
            labelNormalized: 'site b',
            addressLine: 'Plot 2, Thika Road',
            isActive: false,
          },
        ],
      });

      const response = await request(app).get(CUSTOMERS).set('Cookie', cookie);

      // A retired site must not inflate the figure.
      expect(response.body.data[0].addressCount).toBe(1);
    });
  });

  describe('addresses belong to exactly one customer', () => {
    it('adds an address to a customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({
          label: 'Kiambu Road site',
          addressLine: 'Plot 44, Kiambu Road',
          directions: 'Past the shell station, blue gate.',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.addresses).toHaveLength(1);
      expect(response.body.data.addresses[0]).toMatchObject({
        label: 'Kiambu Road site',
        customerId: customer.id,
      });
    });

    it('supports several sites for one customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Site one', addressLine: 'Plot 1, Ngong Road' });
      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Site two', addressLine: 'Plot 2, Thika Road' });

      expect(response.body.data.addresses).toHaveLength(2);
    });

    it('refuses to edit an address through the wrong customer', async () => {
      // The ownership rule. Without this check a guessed id could reach
      // another customer's site.
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedCustomer({ name: 'Owner' });
      const other = await seedCustomer({ name: 'Other' });
      const headers = await csrfHeaders(cookie);

      const created = await request(app)
        .post(`${CUSTOMERS}/${owner.id}/addresses`)
        .set(headers)
        .send({ label: 'Owned site', addressLine: 'Plot 1, Ngong Road' });

      const addressId = created.body.data.addresses[0].id as string;

      const response = await request(app)
        .patch(`${CUSTOMERS}/${other.id}/addresses/${addressId}`)
        .set(headers)
        .send({ label: 'Stolen' });

      expect(response.status).toBe(404);
    });

    it('refuses to deactivate an address through the wrong customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const owner = await seedCustomer({ name: 'Owner' });
      const other = await seedCustomer({ name: 'Other' });
      const headers = await csrfHeaders(cookie);

      const created = await request(app)
        .post(`${CUSTOMERS}/${owner.id}/addresses`)
        .set(headers)
        .send({ label: 'Owned site', addressLine: 'Plot 1, Ngong Road' });

      const addressId = created.body.data.addresses[0].id as string;

      const response = await request(app)
        .post(`${CUSTOMERS}/${other.id}/addresses/${addressId}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(404);
    });

    it('rejects two sites with the same name for one customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Kiambu Road site', addressLine: 'Plot 1, Ngong Road' });

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Kiambu Road site', addressLine: 'Plot 2, Thika Road' });

      expect(response.status).toBe(422);
    });

    it('allows two customers to use the same site name', async () => {
      const { cookie } = await createSignedInUser('admin');
      const first = await seedCustomer({ name: 'First' });
      const second = await seedCustomer({ name: 'Second' });
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(`${CUSTOMERS}/${first.id}/addresses`)
        .set(headers)
        .send({ label: 'Main site', addressLine: 'Plot 1, Ngong Road' });

      const response = await request(app)
        .post(`${CUSTOMERS}/${second.id}/addresses`)
        .set(headers)
        .send({ label: 'Main site', addressLine: 'Plot 2, Thika Road' });

      expect(response.status).toBe(201);
    });

    it('deactivates and reactivates an address', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const headers = await csrfHeaders(cookie);

      const created = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Old site', addressLine: 'Plot 1, Ngong Road' });
      const addressId = created.body.data.addresses[0].id as string;

      const off = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses/${addressId}/deactivate`)
        .set(headers)
        .send({});
      expect(off.body.data.addresses[0].isActive).toBe(false);

      const on = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses/${addressId}/activate`)
        .set(headers)
        .send({});
      expect(on.body.data.addresses[0].isActive).toBe(true);
    });

    it('never deletes an address', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const headers = await csrfHeaders(cookie);

      const created = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Retired site', addressLine: 'Plot 1, Ngong Road' });
      const addressId = created.body.data.addresses[0].id as string;

      await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses/${addressId}/deactivate`)
        .set(headers)
        .send({});

      // Orders and deliveries will reference this address permanently.
      expect(
        await getTestPrisma().customerAddress.findUnique({ where: { id: addressId } }),
      ).not.toBeNull();
    });

    it('returns 404 for an address on an unknown customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${CUSTOMERS}/missing/addresses`)
        .set(headers)
        .send({ label: 'Site', addressLine: 'Plot 1, Ngong Road' });

      expect(response.status).toBe(404);
    });
  });

  describe('updating and activation', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer({ name: 'Before' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${CUSTOMERS}/${customer.id}`)
        .set(headers)
        .send({ name: 'After', phone: '0700111222' });

      expect(response.body.data).toMatchObject({ name: 'After', phone: '0700111222' });
    });

    it('clears the email when null is sent', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await getTestPrisma().customer.create({
        data: {
          name: 'Has email',
          phone: '0722000000',
          phoneNormalized: '254722000000',
          email: 'x@example.com',
          emailNormalized: 'x@example.com',
        },
      });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${CUSTOMERS}/${customer.id}`)
        .set(headers)
        .send({ email: null });

      expect(response.body.data.email).toBeNull();
    });

    it('deactivates and reactivates a customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer({ isActive: true });
      const headers = await csrfHeaders(cookie);

      const off = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/deactivate`)
        .set(headers)
        .send({});
      expect(off.body.data.isActive).toBe(false);

      const on = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/activate`)
        .set(headers)
        .send({});
      expect(on.body.data.isActive).toBe(true);
    });

    it('rejects deactivating an already inactive customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer({ isActive: false });
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('returns 404 for an unknown customer', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app).get(`${CUSTOMERS}/does-not-exist`).set('Cookie', cookie);

      expect(response.status).toBe(404);
    });
  });

  describe('audit', () => {
    it('records customer creation with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(CUSTOMERS)
        .set(headers)
        .send({ name: 'Audited Ltd', phone: '0722123456' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_CUSTOMER' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('customers');
    });

    it('records address creation and deactivation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const headers = await csrfHeaders(cookie);

      const created = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses`)
        .set(headers)
        .send({ label: 'Site', addressLine: 'Plot 1, Ngong Road' });
      const addressId = created.body.data.addresses[0].id as string;

      await request(app)
        .post(`${CUSTOMERS}/${customer.id}/addresses/${addressId}/deactivate`)
        .set(headers)
        .send({});

      const actions = await getTestPrisma().auditLog.findMany({
        where: { entityType: 'CustomerAddress' },
        select: { action: true },
        orderBy: { createdAt: 'asc' },
      });

      expect(actions.map((row) => row.action)).toEqual([
        'CREATE_CUSTOMER_ADDRESS',
        'DEACTIVATE_CUSTOMER_ADDRESS',
      ]);
    });

    it('records before and after values on a customer update', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer({ name: 'Old name' });
      const headers = await csrfHeaders(cookie);

      await request(app)
        .patch(`${CUSTOMERS}/${customer.id}`)
        .set(headers)
        .send({ name: 'New name' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'UPDATE_CUSTOMER', entityId: customer.id },
      });

      expect(audit?.previousData).toMatchObject({ name: 'Old name' });
      expect(audit?.updatedData).toMatchObject({ name: 'New name' });
    });
  });
});
