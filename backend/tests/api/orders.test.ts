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
const QUOTATIONS = `${API_BASE_PATH}/quotations`;

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
          paymentType: 'CASH',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('direct order creation', () => {
    it('creates a CASH order and calculates totals in decimal', async () => {
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
          paymentType: 'CASH',
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

    it('rejects a direct order with no items', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({ customerId: customer.id, customerAddressId: address.id, paymentType: 'CASH' });

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
          paymentType: 'CASH',
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
          paymentType: 'CASH',
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
          paymentType: 'CASH',
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
          paymentType: 'CASH',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(404);
    });
  });

  describe('conversion from an accepted quotation', () => {
    async function createAcceptedQuotation(
      headers: Record<string, string>,
      customerId: string,
      productId: string,
    ): Promise<string> {
      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId,
          items: [{ productId, quantity: 4, agreedUnitPrice: '250.00' }],
        });
      const id = created.body.data.id as string;

      await request(app).post(`${QUOTATIONS}/${id}/accept`).set(headers).send({});

      return id;
    }

    it('converts an accepted quotation, copying its customer and items', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      const quotationId = await createAcceptedQuotation(headers, customer.id, product.id);

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          sourceQuotationId: quotationId,
          customerAddressId: address.id,
          paymentType: 'CASH',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.customerId).toBe(customer.id);
      expect(response.body.data.sourceQuotationId).toBe(quotationId);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(4);
      expect(response.body.data.items[0].agreedUnitPrice).toBe('250.00');
      expect(response.body.data.totalAmount).toBe('1000.00');
    });

    it('rejects converting a draft quotation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();

      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({ customerId: customer.id, items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }] });

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          sourceQuotationId: created.body.data.id,
          customerAddressId: address.id,
          paymentType: 'CASH',
        });

      expect(response.status).toBe(422);
    });

    it('rejects converting the same quotation twice', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      const quotationId = await createAcceptedQuotation(headers, customer.id, product.id);

      await request(app)
        .post(ORDERS)
        .set(headers)
        .send({ sourceQuotationId: quotationId, customerAddressId: address.id, paymentType: 'CASH' });

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({ sourceQuotationId: quotationId, customerAddressId: address.id, paymentType: 'CASH' });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/already been converted/i);
    });

    it('rejects a body providing both a source quotation and items', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      const quotationId = await createAcceptedQuotation(headers, customer.id, product.id);

      const response = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          sourceQuotationId: quotationId,
          customerAddressId: address.id,
          paymentType: 'CASH',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '5.00' }],
        });

      expect(response.status).toBe(422);
    });
  });

  describe('customer credit', () => {
    it('lets a CASH order proceed even when the customer is blocked', async () => {
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
          paymentType: 'CASH',
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
          paymentType: 'CREDIT',
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
            paymentType: 'CREDIT',
            items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
          });

        expect(response.status).toBe(201);
      }
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
          paymentType: 'CREDIT',
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
          paymentType: 'CREDIT',
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

  describe('no permanent deletion', () => {
    it('exposes no delete route', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();

      const created = await request(app)
        .post(ORDERS)
        .set(headers)
        .send({
          customerId: customer.id,
          customerAddressId: address.id,
          paymentType: 'CASH',
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      const response = await request(app)
        .delete(`${ORDERS}/${created.body.data.id}`)
        .set(headers);

      expect(response.status).toBe(404);
      expect(
        await getTestPrisma().order.findUnique({ where: { id: created.body.data.id } }),
      ).not.toBeNull();
    });
  });
});
