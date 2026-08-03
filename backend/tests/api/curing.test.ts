import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { grantCapability } from '../../src/shared/auth/capability.service.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const CURING = `${API_BASE_PATH}/curing`;
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

async function seedProduct(overrides: Partial<{ name: string }> = {}) {
  const name = overrides.name ?? `Product ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().product.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      category: 'HOLLOW_BLOCK',
      size: '6 × 9',
      isActive: true,
      // Curing records are created via the real POST /production endpoint
      // (see seedCuring below), which now requires a confirmed value.
      piecesPerPallet: 12,
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

async function seedOrder(customerId: string, addressId: string, quantity: number, productId: string) {
  const orderNumber = `ORD-TEST-${Math.random().toString(36).slice(2, 10)}`;

  return getTestPrisma().order.create({
    data: {
      orderNumber,
      customerId,
      customerAddressId: addressId,
      addressLabel: 'Test site',
      addressLine: '123 Road',
      paymentArrangement: 'PREPAID',
      totalAmount: (quantity * 10).toFixed(2),
      items: {
        create: [
          {
            productId,
            quantity,
            agreedUnitPrice: '10.00',
            lineTotal: (quantity * 10).toFixed(2),
            remainingQuantity: quantity,
            sortOrder: 0,
          },
        ],
      },
    },
    include: { items: true },
  });
}

/** Creates a real production batch via the API, returning its one item and curing record id. */
async function seedCuring(
  headers: Record<string, string>,
  options: {
    productId: string;
    pallets: number;
    brokenQuantity?: number;
    curingDuration?: 'TWO_DAYS' | 'THREE_DAYS';
    orderId?: string;
  },
): Promise<{ productionItemId: string; curingRecordId: string }> {
  const response = await request(app)
    .post(PRODUCTION)
    .set(headers)
    .send({
      productionDate: '2026-01-10',
      purpose: options.orderId ? 'ORDER' : 'GENERAL_STOCK',
      orderId: options.orderId,
      items: [
        {
          productId: options.productId,
          pallets: options.pallets,
          brokenQuantity: options.brokenQuantity ?? 0,
          curingDuration: options.curingDuration ?? 'TWO_DAYS',
        },
      ],
      rawMaterialUsages: [],
    });

  const item = response.body.data.items[0];
  return { productionItemId: item.id as string, curingRecordId: item.curingRecordId as string };
}

/** Moves a curing record's planned completion into the past, so it can be released in a test. */
async function makeReleasable(curingRecordId: string): Promise<void> {
  await getTestPrisma().curingRecord.update({
    where: { id: curingRecordId },
    data: { plannedCompletion: new Date(Date.now() - 60_000) },
  });
}

describe('curing module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(CURING);

      expect(response.status).toBe(401);
    });

    it('lets an accountant read curing records', async () => {
      const { cookie } = await createSignedInUser('accountant');

      const response = await request(app).get(CURING).set('Cookie', cookie);

      expect(response.status).toBe(200);
    });

    it('refuses an accountant changing curing duration', async () => {
      const { cookie: adminCookie } = await createSignedInUser('admin');
      const adminHeaders = await csrfHeaders(adminCookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(adminHeaders, {
        productId: product.id,
        pallets: 1,
        curingDuration: 'THREE_DAYS',
      });

      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${CURING}/${curingRecordId}/change-duration`)
        .set(headers)
        .send({ reason: 'Trying anyway.' });

      expect(response.status).toBe(403);
    });

    it('refuses an accountant releasing without the capability, then allows it once granted', async () => {
      const { cookie: adminCookie } = await createSignedInUser('admin');
      const adminHeaders = await csrfHeaders(adminCookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(adminHeaders, { productId: product.id, pallets: 1 });
      await makeReleasable(curingRecordId);

      const { user, cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const denied = await request(app).post(`${CURING}/${curingRecordId}/release`).set(headers).send({});
      expect(denied.status).toBe(403);

      await grantCapability(user.id, 'CURING_RELEASE', { userId: user.id });

      const allowed = await request(app).post(`${CURING}/${curingRecordId}/release`).set(headers).send({});
      expect(allowed.status).toBe(200);
    });
  });

  describe('change duration', () => {
    it('shortens a three-day record to two days and recalculates planned completion', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(headers, {
        productId: product.id,
        pallets: 1,
        curingDuration: 'THREE_DAYS',
      });

      const response = await request(app)
        .patch(`${CURING}/${curingRecordId}/change-duration`)
        .set(headers)
        .send({ reason: 'Yard needs the space sooner.' });

      expect(response.status).toBe(200);
      expect(response.body.data.currentDuration).toBe('TWO_DAYS');
      expect(response.body.data.originalDuration).toBe('THREE_DAYS');

      const record = await getTestPrisma().curingRecord.findUnique({ where: { id: curingRecordId } });
      const expectedMs = record!.startedAt.getTime() + 2 * 24 * 60 * 60 * 1000;
      expect(record?.plannedCompletion.getTime()).toBe(expectedMs);
      expect(record?.durationChangeReason).toBe('Yard needs the space sooner.');

      const audit = await getTestPrisma().auditLog.findFirst({ where: { action: 'CHANGE_CURING_DURATION' } });
      expect(audit?.module).toBe('curing');
    });

    it('rejects changing a two-day record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(headers, {
        productId: product.id,
        pallets: 1,
        curingDuration: 'TWO_DAYS',
      });

      const response = await request(app)
        .patch(`${CURING}/${curingRecordId}/change-duration`)
        .set(headers)
        .send({ reason: 'Attempted anyway.' });

      expect(response.status).toBe(422);
    });

    it('rejects a missing reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(headers, {
        productId: product.id,
        pallets: 1,
        curingDuration: 'THREE_DAYS',
      });

      const response = await request(app)
        .patch(`${CURING}/${curingRecordId}/change-duration`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });
  });

  describe('release', () => {
    it('rejects release before the planned completion', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(headers, { productId: product.id, pallets: 1 });

      const response = await request(app).post(`${CURING}/${curingRecordId}/release`).set(headers).send({});

      expect(response.status).toBe(422);
    });

    it('releases general-stock production to GENERAL_STOCK_RELEASE and completes the batch', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { productionItemId, curingRecordId } = await seedCuring(headers, {
        productId: product.id,
        pallets: 5,
      });
      await makeReleasable(curingRecordId);

      const response = await request(app).post(`${CURING}/${curingRecordId}/release`).set(headers).send({});

      expect(response.status).toBe(200);
      expect(response.body.data.releasedQuantity).toBe(60);
      expect(response.body.data.actualRelease).not.toBeNull();

      const movement = await getTestPrisma().finishedStockMovement.findFirst({
        where: { productId: product.id, movementType: 'GENERAL_STOCK_RELEASE' },
      });
      expect(movement?.quantity).toBe(60);
      expect(movement?.relatedEntityId).toBe(curingRecordId);

      const balance = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(balance?.physicalQuantity).toBe(60);

      const item = await getTestPrisma().productionItem.findUnique({ where: { id: productionItemId } });
      const batch = await getTestPrisma().productionBatch.findUnique({ where: { id: item!.productionBatchId } });
      expect(batch?.status).toBe('COMPLETED');

      const audit = await getTestPrisma().auditLog.findFirst({ where: { action: 'RELEASE_CURING' } });
      expect(audit?.userId).toBe(user.id);
    });

    it('splits order-allocated and excess portions between CURING_RELEASE and GENERAL_STOCK_RELEASE', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const address = await seedAddress(customer.id);
      const product = await seedProduct();
      const order = await seedOrder(customer.id, address.id, 20, product.id);

      const { curingRecordId } = await seedCuring(headers, {
        productId: product.id,
        pallets: 5, // 60 pieces, 20 allocated to the order, 40 excess
        orderId: order.id,
      });
      await makeReleasable(curingRecordId);

      const response = await request(app).post(`${CURING}/${curingRecordId}/release`).set(headers).send({});
      expect(response.status).toBe(200);

      const curingMovement = await getTestPrisma().finishedStockMovement.findFirst({
        where: { productId: product.id, movementType: 'CURING_RELEASE' },
      });
      expect(curingMovement?.quantity).toBe(20);

      const generalMovement = await getTestPrisma().finishedStockMovement.findFirst({
        where: { productId: product.id, movementType: 'GENERAL_STOCK_RELEASE' },
      });
      expect(generalMovement?.quantity).toBe(40);

      const orderItem = await getTestPrisma().orderItem.findFirst({ where: { orderId: order.id } });
      expect(orderItem?.allocatedQuantity).toBe(20);
    });

    it('reduces released quantity by breakage discovered during curing and records it', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(headers, { productId: product.id, pallets: 5 });
      await makeReleasable(curingRecordId);

      const response = await request(app)
        .post(`${CURING}/${curingRecordId}/release`)
        .set(headers)
        .send({ brokenQuantity: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.releasedQuantity).toBe(50);
      expect(response.body.data.brokenQuantity).toBe(10);

      const balance = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(balance?.physicalQuantity).toBe(50);

      const broken = await getTestPrisma().brokenProductRecord.findFirst({
        where: { stage: 'CURING', relatedEntityId: curingRecordId },
      });
      expect(broken?.quantity).toBe(10);
    });

    it('rejects releasing an already-released record', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(headers, { productId: product.id, pallets: 1 });
      await makeReleasable(curingRecordId);

      await request(app).post(`${CURING}/${curingRecordId}/release`).set(headers).send({});
      const response = await request(app).post(`${CURING}/${curingRecordId}/release`).set(headers).send({});

      expect(response.status).toBe(409);
    });

    it('rejects a broken quantity greater than the quantity entering curing', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const product = await seedProduct();
      const { curingRecordId } = await seedCuring(headers, { productId: product.id, pallets: 1 });
      await makeReleasable(curingRecordId);

      const response = await request(app)
        .post(`${CURING}/${curingRecordId}/release`)
        .set(headers)
        .send({ brokenQuantity: 999 });

      expect(response.status).toBe(422);
    });
  });
});
