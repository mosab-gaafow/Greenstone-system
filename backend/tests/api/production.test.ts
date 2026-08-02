import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const PRODUCTION = `${API_BASE_PATH}/production`;

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

async function seedUnit(overrides: Partial<{ name: string }> = {}) {
  const name = overrides.name ?? `Unit ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().measurementUnit.create({
    data: { name, nameNormalized: normalizeForComparison(name), isActive: true },
  });
}

async function seedRawMaterial(
  overrides: Partial<{ name: string; isActive: boolean; openingQuantity: string }> = {},
) {
  const name = overrides.name ?? `Material ${Math.random().toString(36).slice(2, 8)}`;
  const measurementUnitId = (await seedUnit()).id;

  return getTestPrisma().rawMaterial.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      measurementUnitId,
      isActive: overrides.isActive ?? true,
      stockBalance: { create: { quantity: overrides.openingQuantity ?? '1000.000' } },
    },
  });
}

async function seedCustomer() {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().customer.create({
    data: {
      name: `Customer ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: true,
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

async function seedOrder(customerId: string, addressId: string, items: { productId: string; quantity: number }[]) {
  const orderNumber = `ORD-TEST-${Math.random().toString(36).slice(2, 10)}`;

  return getTestPrisma().order.create({
    data: {
      orderNumber,
      customerId,
      customerAddressId: addressId,
      addressLabel: 'Test site',
      addressLine: '123 Road',
      paymentArrangement: 'PREPAID',
      totalAmount: (items.reduce((sum, item) => sum + item.quantity * 10, 0)).toFixed(2),
      items: {
        create: items.map((item, index) => ({
          productId: item.productId,
          quantity: item.quantity,
          agreedUnitPrice: '10.00',
          lineTotal: (item.quantity * 10).toFixed(2),
          remainingQuantity: item.quantity,
          sortOrder: index,
        })),
      },
    },
    include: { items: true },
  });
}

describe('production module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(PRODUCTION);

      expect(response.status).toBe(401);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const product = await seedProduct();

      const response = await request(app)
        .post(PRODUCTION)
        .set('Cookie', cookie)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 5, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('general-stock production', () => {
    it('calculates produced/usable quantities and starts curing automatically', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 10, brokenQuantity: 3, curingDuration: 'THREE_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.productionNumber).toMatch(/^PRD-\d{4}-\d{4}$/);
      expect(response.body.data.status).toBe('IN_PROGRESS');

      const item = response.body.data.items[0];
      expect(item.producedQuantity).toBe(120);
      expect(item.brokenQuantity).toBe(3);
      expect(item.usableQuantity).toBe(117);
      expect(item.allocatedQuantity).toBe(0);
      expect(item.excessQuantity).toBe(117);
      expect(item.curingRecordId).toBeTruthy();

      const curingRecord = await getTestPrisma().curingRecord.findUnique({
        where: { id: item.curingRecordId as string },
      });
      expect(curingRecord?.quantityEntering).toBe(117);
      expect(curingRecord?.originalDuration).toBe('THREE_DAYS');
      expect(curingRecord?.currentDuration).toBe('THREE_DAYS');
      const expectedMs = curingRecord!.startedAt.getTime() + 3 * 24 * 60 * 60 * 1000;
      expect(curingRecord?.plannedCompletion.getTime()).toBe(expectedMs);

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_PRODUCTION_BATCH' },
      });
      expect(audit?.userId).toBe(user.id);
      expect(audit?.documentNumber).toMatch(/^PRD-/);
    });

    it('records a PRODUCTION-stage broken-product record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 5, brokenQuantity: 2, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      const record = await getTestPrisma().brokenProductRecord.findFirst({
        where: { productId: product.id, stage: 'PRODUCTION' },
      });
      expect(record?.quantity).toBe(2);
      expect(record?.relatedEntityId).toBe(response.body.data.items[0].id as string);
    });

    it('decrements raw-material stock and rejects when insufficient', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const material = await seedRawMaterial({ openingQuantity: '50.000' });

      const insufficient = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [{ rawMaterialId: material.id, quantity: '100.000' }],
        });

      expect(insufficient.status).toBe(422);
      expect(insufficient.body.error.code).toBe('INSUFFICIENT_RAW_MATERIAL');

      const balanceUnchanged = await getTestPrisma().rawMaterialStockBalance.findUnique({
        where: { rawMaterialId: material.id },
      });
      expect(balanceUnchanged?.quantity.toFixed(3)).toBe('50.000');
      expect(await getTestPrisma().productionBatch.count()).toBe(0);

      const success = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [{ rawMaterialId: material.id, quantity: '20.000' }],
        });

      expect(success.status).toBe(201);
      expect(success.body.data.rawMaterialUsages[0].quantity).toBe('20.000');

      const balanceAfter = await getTestPrisma().rawMaterialStockBalance.findUnique({
        where: { rawMaterialId: material.id },
      });
      expect(balanceAfter?.quantity.toFixed(3)).toBe('30.000');

      const movement = await getTestPrisma().rawMaterialMovement.findFirst({
        where: { rawMaterialId: material.id, movementType: 'PRODUCTION_USAGE' },
      });
      expect(movement?.quantity.toFixed(3)).toBe('-20.000');
    });
  });

  describe('order production', () => {
    it('allocates the needed quantity to the order and credits the rest to excess', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      const order = await seedOrder(customer.id, address.id, [{ productId: product.id, quantity: 50 }]);

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'ORDER',
          orderId: order.id,
          items: [{ productId: product.id, pallets: 10, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(201);
      const item = response.body.data.items[0];
      expect(item.producedQuantity).toBe(120);
      expect(item.allocatedQuantity).toBe(50);
      expect(item.excessQuantity).toBe(70);

      const orderItem = await getTestPrisma().orderItem.findFirst({ where: { orderId: order.id } });
      expect(orderItem?.producedQuantity).toBe(50);

      const allocation = await getTestPrisma().productionOrderAllocation.findFirst({
        where: { orderItemId: orderItem!.id },
      });
      expect(allocation?.quantity).toBe(50);
    });

    it('caps the allocation at what the order item still needs', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      const order = await seedOrder(customer.id, address.id, [{ productId: product.id, quantity: 10 }]);

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'ORDER',
          orderId: order.id,
          items: [{ productId: product.id, pallets: 5, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      const item = response.body.data.items[0];
      expect(item.producedQuantity).toBe(60);
      expect(item.allocatedQuantity).toBe(10);
      expect(item.excessQuantity).toBe(50);
    });

    it('rejects a product that is not on the referenced order', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const orderedProduct = await seedProduct();
      const otherProduct = await seedProduct();
      const order = await seedOrder(customer.id, address.id, [
        { productId: orderedProduct.id, quantity: 10 },
      ]);

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'ORDER',
          orderId: order.id,
          items: [{ productId: otherProduct.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/not on order/i);
    });

    it('rejects ORDER purpose with no order id', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'ORDER',
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(422);
    });

    it('rejects GENERAL_STOCK purpose with an order id', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      const order = await seedOrder(customer.id, address.id, [{ productId: product.id, quantity: 10 }]);

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          orderId: order.id,
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(422);
    });
  });

  describe('validation', () => {
    it('rejects zero pallets', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 0, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(422);
    });

    it('rejects broken quantity exceeding produced quantity', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 100, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(422);
    });

    it('rejects an inactive product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct({ isActive: false });

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });

    it('rejects an inactive raw material', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const material = await seedRawMaterial({ isActive: false });

      const response = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [{ rawMaterialId: material.id, quantity: '1' }],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });
  });

  describe('listing', () => {
    it('lists created batches', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 2, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      const response = await request(app).get(PRODUCTION).set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].itemCount).toBe(1);
    });
  });

  describe('no permanent deletion', () => {
    it('exposes no delete route', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();

      const created = await request(app)
        .post(PRODUCTION)
        .set(headers)
        .send({
          productionDate: '2026-01-10',
          purpose: 'GENERAL_STOCK',
          items: [{ productId: product.id, pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' }],
          rawMaterialUsages: [],
        });

      const response = await request(app)
        .delete(`${PRODUCTION}/${created.body.data.id}`)
        .set(headers);

      expect(response.status).toBe(404);
      expect(
        await getTestPrisma().productionBatch.findUnique({ where: { id: created.body.data.id } }),
      ).not.toBeNull();
    });
  });
});
