import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
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

async function seedAddress(customerId: string) {
  const label = `Site ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().customerAddress.create({
    data: {
      customerId,
      label,
      labelNormalized: normalizeForComparison(label),
      addressLine: '123 Industrial Road',
      isActive: true,
    },
  });
}

/** Inserted directly — the deactivation check only needs the raw row. */
async function seedOrder(
  customerId: string,
  addressId: string,
  overrides: Partial<{ status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED' }> = {},
) {
  return getTestPrisma().order.create({
    data: {
      orderNumber: `ORD-TEST-${Math.random().toString(36).slice(2, 8)}`,
      customerId,
      customerAddressId: addressId,
      addressLabel: 'Site',
      addressLine: '123 Industrial Road',
      paymentArrangement: 'PREPAID',
      status: overrides.status ?? 'PENDING',
      totalAmount: '10000.00',
    },
  });
}

async function seedOpeningBalance(customerId: string, amount: string) {
  await getTestPrisma().customerOpeningBalance.create({
    data: { customerId, amount, effectiveDate: new Date(), reason: 'Test seed' },
  });
}

/** Inserted directly, like seedOrder — the deactivation check only needs the raw rows. */
async function seedIssuedInvoice(customerId: string, addressId: string, amount: string) {
  const order = await getTestPrisma().order.create({
    data: {
      orderNumber: `ORD-TEST-${Math.random().toString(36).slice(2, 8)}`,
      customerId,
      customerAddressId: addressId,
      addressLabel: 'Site',
      addressLine: '123 Industrial Road',
      paymentArrangement: 'CREDIT',
      status: 'COMPLETED',
      totalAmount: amount,
    },
  });

  await getTestPrisma().invoice.create({
    data: {
      invoiceNumber: `INV-TEST-${Math.random().toString(36).slice(2, 8)}`,
      orderId: order.id,
      customerId,
      status: 'ISSUED',
      totalAmount: amount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

    describe('outstanding balance filter (Phase 6E)', () => {
      it('treats a customer with no opening-balance row as no outstanding balance', async () => {
        const { cookie } = await createSignedInUser('admin');
        const noRow = await seedCustomer({ name: 'No balance row' });
        const zeroRow = await seedCustomer({ name: 'Zero balance row' });
        await getTestPrisma().customerOpeningBalance.create({
          data: {
            customerId: zeroRow.id,
            amount: '0.00',
            effectiveDate: new Date(),
            reason: 'Test seed',
          },
        });
        const withBalance = await seedCustomer({ name: 'Has balance' });
        await getTestPrisma().customerOpeningBalance.create({
          data: {
            customerId: withBalance.id,
            amount: '500000.00',
            effectiveDate: new Date(),
            reason: 'Test seed',
          },
        });

        const noBalance = await request(app)
          .get(`${CUSTOMERS}?hasOutstandingBalance=false`)
          .set('Cookie', cookie);
        const hasBalance = await request(app)
          .get(`${CUSTOMERS}?hasOutstandingBalance=true`)
          .set('Cookie', cookie);

        const noBalanceNames = (noBalance.body.data as { name: string }[]).map((c) => c.name);
        expect(noBalanceNames).toEqual(expect.arrayContaining([noRow.name, zeroRow.name]));
        expect(noBalanceNames).not.toContain(withBalance.name);

        expect(hasBalance.body.data).toHaveLength(1);
        expect(hasBalance.body.data[0].name).toBe(withBalance.name);
      });

      it('returns every customer when no balance filter is given', async () => {
        const { cookie } = await createSignedInUser('admin');
        await seedCustomer({ name: 'A' });
        const withBalance = await seedCustomer({ name: 'B' });
        await getTestPrisma().customerOpeningBalance.create({
          data: {
            customerId: withBalance.id,
            amount: '10000.00',
            effectiveDate: new Date(),
            reason: 'Test seed',
          },
        });

        const response = await request(app).get(CUSTOMERS).set('Cookie', cookie);

        expect(response.body.data).toHaveLength(2);
      });

      it('combines the balance filter with search', async () => {
        const { cookie } = await createSignedInUser('admin');
        const match = await seedCustomer({ name: 'Kamau Contractors' });
        await getTestPrisma().customerOpeningBalance.create({
          data: {
            customerId: match.id,
            amount: '20000.00',
            effectiveDate: new Date(),
            reason: 'Test seed',
          },
        });
        await seedCustomer({ name: 'Kamau Builders' });

        const response = await request(app)
          .get(`${CUSTOMERS}?search=Kamau&hasOutstandingBalance=true`)
          .set('Cookie', cookie);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Kamau Contractors');
      });
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

  describe('deactivation safeguards (Phase 6E addendum)', () => {
    it('blocks normal deactivation while an active order exists', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      await seedOrder(customer.id, address.id, { status: 'PENDING' });

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('CUSTOMER_DEACTIVATION_BLOCKED');
      expect(response.body.error.message).toMatch(/1 active order/i);
      expect(response.body.error.message).toMatch(/PENDING/);

      const stillActive = await getTestPrisma().customer.findUnique({ where: { id: customer.id } });
      expect(stillActive?.isActive).toBe(true);
    });

    it('reports every active order, by number and status', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const first = await seedOrder(customer.id, address.id, { status: 'PENDING' });
      const second = await seedOrder(customer.id, address.id, { status: 'IN_PRODUCTION' });

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.body.error.message).toMatch(/2 active order/i);
      expect(response.body.error.message).toContain(`${first.orderNumber} (PENDING)`);
      expect(response.body.error.message).toContain(`${second.orderNumber} (IN_PRODUCTION)`);
    });

    it('blocks normal deactivation with a non-zero outstanding balance', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      await seedOpeningBalance(customer.id, '50000.00');

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('CUSTOMER_DEACTIVATION_BLOCKED');
      expect(response.body.error.message).toMatch(/50000\.00/);
    });

    it('blocks normal deactivation with an unpaid ISSUED invoice even when the opening balance is zero', async () => {
      // Regression test (Phase 14.2): the safeguard used to check only the
      // static opening-balance row, so a customer with a zero opening
      // balance but a real unpaid invoice could slip through deactivation.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      await seedIssuedInvoice(customer.id, address.id, '15000.00');

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('CUSTOMER_DEACTIVATION_BLOCKED');
      expect(response.body.error.message).toMatch(/15000\.00/);
    });

    it('allows normal deactivation once every order is completed or cancelled and the balance is zero', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      await seedOrder(customer.id, address.id, { status: 'COMPLETED' });
      await seedOrder(customer.id, address.id, { status: 'CANCELLED' });

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);
    });

    it('never deletes or hides completed/cancelled orders after deactivation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const completed = await seedOrder(customer.id, address.id, { status: 'COMPLETED' });

      await request(app).post(`${CUSTOMERS}/${customer.id}/deactivate`).set(headers).send({});

      const order = await getTestPrisma().order.findUnique({ where: { id: completed.id } });
      expect(order).not.toBeNull();
      expect(order?.status).toBe('COMPLETED');
    });
  });

  describe('force deactivation (Phase 6E addendum)', () => {
    it('refuses an accountant force-deactivating a customer', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/force-deactivate`)
        .set(headers)
        .send({ reason: 'Exceptional business reason.' });

      expect(response.status).toBe(403);
    });

    it('rejects a missing reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/force-deactivate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('lets an admin force-deactivate despite an active order and a balance, without touching either', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const order = await seedOrder(customer.id, address.id, { status: 'PENDING' });
      await seedOpeningBalance(customer.id, '75000.00');

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/force-deactivate`)
        .set(headers)
        .send({ reason: 'Customer under investigation.' });

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.deactivationReason).toBe('Customer under investigation.');

      // Never auto-cancelled, never auto-erased.
      const untouchedOrder = await getTestPrisma().order.findUnique({ where: { id: order.id } });
      expect(untouchedOrder?.status).toBe('PENDING');
      const untouchedBalance = await getTestPrisma().customerOpeningBalance.findUnique({
        where: { customerId: customer.id },
      });
      expect(untouchedBalance?.amount.toFixed(2)).toBe('75000.00');

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'FORCE_DEACTIVATE_CUSTOMER', entityId: customer.id },
      });
      expect(audit?.userId).toBe(user.id);
      expect(audit?.reason).toBe('Customer under investigation.');
      expect(audit?.previousData).toMatchObject({
        isActive: true,
        activeOrders: [`${order.orderNumber} (PENDING)`],
        outstandingBalance: '75000.00',
      });
      expect(audit?.updatedData).toMatchObject({
        isActive: false,
        deactivationReason: 'Customer under investigation.',
      });
    });

    it('rejects force-deactivating an already inactive customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer({ isActive: false });

      const response = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/force-deactivate`)
        .set(headers)
        .send({ reason: 'Any reason.' });

      expect(response.status).toBe(422);
    });

    it('clears the deactivation reason on reactivation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      await request(app)
        .post(`${CUSTOMERS}/${customer.id}/force-deactivate`)
        .set(headers)
        .send({ reason: 'Temporary hold.' });

      const reactivated = await request(app)
        .post(`${CUSTOMERS}/${customer.id}/activate`)
        .set(headers)
        .send({});

      expect(reactivated.body.data.deactivationReason).toBeNull();
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
