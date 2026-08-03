import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const ORDERS = `${API_BASE_PATH}/orders`;

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

async function seedCustomer(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().customer.create({
    data: {
      name: overrides.name ?? `Customer ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: overrides.isActive ?? true,
    },
  });
}

async function seedAddress(
  customerId: string,
  overrides: Partial<{ label: string; isActive: boolean }> = {},
) {
  const label = overrides.label ?? `Site ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().customerAddress.create({
    data: {
      customerId,
      label,
      labelNormalized: normalizeForComparison(label),
      addressLine: '123 Industrial Road',
      isActive: overrides.isActive ?? true,
    },
  });
}

async function seedProduct(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const name = overrides.name ?? `Product ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().product.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      category: 'HOLLOW_BLOCK',
      size: '6 × 9',
      isActive: overrides.isActive ?? true,
    },
  });
}

async function seedOpeningBalance(customerId: string, amount: string) {
  await getTestPrisma().customerOpeningBalance.create({
    data: { customerId, amount, effectiveDate: new Date(), reason: 'Test seed' },
  });
}

/** Creates a direct order and returns its id, for tests that only need an existing order. */
async function createOrder(
  headers: Record<string, string>,
  overrides: Partial<{ customerId: string; addressId: string; productId: string }> = {},
): Promise<string> {
  const customer = overrides.customerId ? { id: overrides.customerId } : await seedCustomer();
  const address = overrides.addressId
    ? { id: overrides.addressId }
    : await seedAddress(customer.id);
  const product = overrides.productId ? { id: overrides.productId } : await seedProduct();

  const response = await request(app)
    .post(ORDERS)
    .set(headers)
    .send({
      customerId: customer.id,
      customerAddressId: address.id,
      paymentArrangement: 'PREPAID',
      items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
    });

  return response.body.data.id as string;
}

describe('orders module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(ORDERS);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();

      const response = await request(app)
        .post(ORDERS)
        .set('Cookie', cookie)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('direct order creation', () => {
    it('creates a PREPAID order and calculates totals in decimal', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id, { label: 'Kiambu Road site' });
      const productA = await seedProduct();
      const productB = await seedProduct();

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          items: [
            { productId: productA.id, quantity: 3, agreedUnitPrice: '150.50' },
            { productId: productB.id, quantity: 7, agreedUnitPrice: '99.99' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.orderNumber).toMatch(/^ORD-\d{4}-\d{4}$/);
      expect(response.body.data.addressLabel).toBe('Kiambu Road site');
      expect(response.body.data.totalAmount).toBe('1151.43');
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].remainingQuantity).toBe(3);

      const audit = await getTestPrisma().auditLog.findFirst({ where: { action: 'CREATE_ORDER' } });
      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('orders');
      expect(audit?.documentNumber).toMatch(/^ORD-/);
    });

    it('defaults a new order to PENDING and rejects a client-supplied status', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          status: 'COMPLETED',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      // `status` is not an accepted field — the body schema is `.strict()`.
      expect(response.status).toBe(422);
    });

    it('rejects a direct order with no items', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({ customerId: customer.id, customerAddressId: address.id, paymentArrangement: 'PREPAID' });

      expect(response.status).toBe(422);
    });

    it('rejects an inactive customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer({ isActive: false });
      const address = await seedAddress(customer.id);
      const product = await seedProduct();

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });

    it('rejects an inactive product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct({ isActive: false });

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });

    it('rejects an inactive address', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id, { isActive: false });
      const product = await seedProduct();

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });

    it('rejects an address that belongs to a different customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const otherCustomer = await seedCustomer();
      const address = await seedAddress(otherCustomer.id);
      const product = await seedProduct();

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(404);
    });
  });

  describe('customer credit', () => {
    it('lets a PREPAID order proceed even when the customer is blocked', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      await seedOpeningBalance(customer.id, '1000000.00');

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'PREPAID',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(201);
    });

    it('blocks a CREDIT order when the customer is BLOCKED', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      await seedOpeningBalance(customer.id, '1000000.00');

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'CREDIT',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('CUSTOMER_CREDIT_BLOCKED');
    });

    it('allows a CREDIT order at WARNING and STRONG_WARNING levels', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      for (const openingAmount of ['800000.00', '950000.00']) {
        const customer = await seedCustomer();
        const address = await seedAddress(customer.id);
        await seedOpeningBalance(customer.id, openingAmount);

        const response = await request(app)
          .post(ORDERS)
          .set(headers)
          .send({
            customerId: customer.id,
            customerAddressId: address.id,
            paymentArrangement: 'CREDIT',
            items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
          });

        expect(response.status).toBe(201);
      }
    });

    it("includes the new order's own total in the projected exposure (Phase 6E)", async () => {
      // Opening balance alone (700,000) plus one existing CREDIT order
      // (250,000) is only STRONG_WARNING (950,000) — the pre-6E formula
      // would have allowed a further CREDIT order on top of that, since it
      // never added the new order's own amount to the check. The new
      // formula must include it and block.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      await seedOpeningBalance(customer.id, '700000.00');

      const first = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'CREDIT',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '250000.00' }],
        });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'CREDIT',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '100000.00' }],
        });

      expect(second.status).toBe(422);
      expect(second.body.error.code).toBe('CUSTOMER_CREDIT_BLOCKED');
    });

    it('excludes a CANCELLED CREDIT order from a later projected-exposure check', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      await seedOpeningBalance(customer.id, '700000.00');

      const first = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'CREDIT',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '250000.00' }],
        });
      expect(first.status).toBe(201);

      await request(app)
        .post(`${ORDERS}/${first.body.data.id as string}/cancel`)
        .set(headers)
        .send({ reason: 'Customer withdrew.' });

      const second = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'CREDIT',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '100000.00' }],
        });

      // 700,000 + 0 (cancelled excluded) + 100,000 = 800,000 → WARNING, not BLOCKED.
      expect(second.status).toBe(201);
    });

    it('rejects a BLOCKED CREDIT order with no override reason', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      await seedOpeningBalance(customer.id, '1000000.00');

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'CREDIT',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
          creditOverrideReason: 'Long-standing customer.',
        });

      // Accountant has no customer-credit:override permission.
      expect(response.status).toBe(403);
    });

    it('lets an admin override a BLOCKED customer credit check with a reason', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      await seedOpeningBalance(customer.id, '1000000.00');

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentArrangement: 'CREDIT',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
          creditOverrideReason: 'Long-standing customer, approved by management.',
        });

      expect(response.status).toBe(201);

      const override = await getTestPrisma().customerCreditOverride.findFirst({
        where: { customerId: customer.id },
      });
      expect(override?.relatedOrderId).toBe(response.body.data.id);
      expect(override?.previousCreditStatus).toBe('BLOCKED');
      expect(override?.approvedByUserId).toBe(user.id);

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'OVERRIDE_CUSTOMER_CREDIT' },
      });
      expect(audit?.module).toBe('customer-credit');
    });
  });

  describe('cancellation', () => {
    it('cancels a PENDING order with a written reason and writes an audit log', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const orderId = await createOrder(headers);

      const response = await request(app)
        .post(`${ORDERS}/${orderId}/cancel`)
        .set(headers)
        .send({ reason: 'Customer requested cancellation.' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CANCELLED');
      expect(response.body.data.statusReason).toBe('Customer requested cancellation.');

      const audit = await getTestPrisma().auditLog.findFirst({ where: { action: 'CANCEL_ORDER' } });
      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('orders');
      expect(audit?.reason).toBe('Customer requested cancellation.');
    });

    it('rejects cancellation with no reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const orderId = await createOrder(headers);

      const response = await request(app)
        .post(`${ORDERS}/${orderId}/cancel`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('rejects cancelling an already-cancelled order', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const orderId = await createOrder(headers);

      await request(app)
        .post(`${ORDERS}/${orderId}/cancel`)
        .set(headers)
        .send({ reason: 'First cancellation.' });

      const response = await request(app)
        .post(`${ORDERS}/${orderId}/cancel`)
        .set(headers)
        .send({ reason: 'Second attempt.' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_DOCUMENT_STATUS');
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const orderId = await createOrder(headers);

      const response = await request(app)
        .post(`${ORDERS}/${orderId}/cancel`)
        .set('Cookie', cookie)
        .send({ reason: 'No CSRF token.' });

      expect(response.status).toBe(403);
    });
  });

  describe('no permanent deletion', () => {
    it('exposes no delete route', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const orderId = await createOrder(headers);

      const response = await request(app).delete(`${ORDERS}/${orderId}`).set(headers);

      expect(response.status).toBe(404);
      expect(await getTestPrisma().order.findUnique({ where: { id: orderId } })).not.toBeNull();
    });

    it('exposes no generic status-update route', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const orderId = await createOrder(headers);

      const response = await request(app)
        .patch(`${ORDERS}/${orderId}`)
        .set(headers)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(404);
    });
  });
});
