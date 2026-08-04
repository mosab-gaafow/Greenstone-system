import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const DELIVERIES = `${API_BASE_PATH}/deliveries`;

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

async function seedProduct(name: string, maxPiecesPerTruck = 1000) {
  return getTestPrisma().product.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      category: 'HOLLOW_BLOCK',
      size: 'Test',
      operationalName: name.toLowerCase(),
      operationalNameNormalized: name.toLowerCase(),
      piecesPerPallet: 12,
      maxPiecesPerTruck,
      isActive: true,
    },
  });
}

async function seedFinishedStock(productId: string, physicalQuantity: number) {
  return getTestPrisma().finishedStockBalance.upsert({
    where: { productId },
    create: { productId, physicalQuantity, availableQuantity: physicalQuantity },
    update: { physicalQuantity, availableQuantity: physicalQuantity },
  });
}

async function seedCustomer(name: string) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;
  return getTestPrisma().customer.create({
    data: { name, phone, phoneNormalized: normalizePhone(phone), isActive: true },
  });
}

async function seedAddress(customerId: string, label: string) {
  return getTestPrisma().customerAddress.create({
    data: {
      customerId,
      label,
      labelNormalized: normalizeForComparison(label),
      addressLine: `${label} Road`,
      isActive: true,
    },
  });
}

async function seedDriver(name: string) {
  return getTestPrisma().driver.create({
    data: {
      name,
      phone: `07${String(Math.floor(10000000 + Math.random() * 89999999))}`,
      nationalId: `${Math.floor(10000000 + Math.random() * 89999999)}`,
      nationalIdNormalized: `${Math.floor(10000000 + Math.random() * 89999999)}`,
      isActive: true,
    },
  });
}

async function seedVehicleOwner(name: string) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;
  return getTestPrisma().vehicleOwner.create({
    data: { name, phone, phoneNormalized: normalizePhone(phone), isActive: true },
  });
}

async function seedVehicle(registrationNumber: string, vehicleOwnerId: string) {
  return getTestPrisma().vehicle.create({
    data: {
      registrationNumber,
      registrationNormalized: registrationNumber.replace(/[\s-]/g, '').toUpperCase(),
      vehicleType: 'Truck',
      vehicleOwnerId,
      isActive: true,
    },
  });
}

async function seedOrder(
  customerId: string,
  addressId: string,
  paymentArrangement: 'PREPAID' | 'CREDIT' = 'CREDIT',
) {
  const orderNumber = `ORD-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return getTestPrisma().order.create({
    data: {
      orderNumber,
      customerId,
      customerAddressId: addressId,
      addressLabel: 'Test Site',
      addressLine: 'Test Road',
      paymentArrangement,
      totalAmount: 0,
    },
  });
}

async function seedOrderItem(orderId: string, productId: string, quantity: number, unitPrice: string) {
  return getTestPrisma().orderItem.create({
    data: {
      orderId,
      productId,
      quantity,
      agreedUnitPrice: unitPrice,
      lineTotal: String(Number(unitPrice) * quantity),
      remainingQuantity: quantity,
      sortOrder: 1,
    },
  });
}

async function seedAdmin(): Promise<{ cookie: string }> {
  const { cookie } = await createSignedInUser('admin');
  return { cookie };
}

describe('deliveries module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectPrisma();
    await disconnectTestPrisma();
  });

  // =========================================================================
  // POST /deliveries — creation
  // =========================================================================

  describe('POST /deliveries', () => {
    it('creates a planned delivery and reserves stock', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 500);
      // Ensure allocated/delivered are set for the quantity check
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      // Seed order with allocated quantity so delivery has something to commit against
      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8001',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'CREDIT',
          totalAmount: '5000.00',
          items: {
            create: {
              productId: product.id,
              quantity: 200,
              agreedUnitPrice: '25.00',
              lineTotal: '5000.00',
              remainingQuantity: 200,
              allocatedQuantity: 200,
              sortOrder: 1,
            },
          },
        },
        include: { items: true },
      });

      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 999Z', vehicleOwner.id);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            {
              orderItemId: order.items[0]!.id,
              productId: product.id,
              plannedQuantity: 50,
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deliveryNumber).toMatch(/^DEL-2026-\d{4}$/);
      expect(res.body.data.status).toBe('PLANNED');
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].plannedQuantity).toBe(50);

      // Verify stock reservation
      const balance = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(balance!.reservedQuantity).toBe(50);
      expect(balance!.availableQuantity).toBe(450);

      // Verify no FinishedStockMovement was written
      const movements = await getTestPrisma().finishedStockMovement.count({
        where: { productId: product.id },
      });
      expect(movements).toBe(0);

      // Verify audit log
      const auditLogs = await getTestPrisma().auditLog.count({
        where: { module: 'deliveries', action: 'CREATE_DELIVERY' },
      });
      expect(auditLogs).toBe(1);
    });

    it('rejects missing driver', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: 'some-order-id',
          customerAddressId: 'some-address-id',
          vehicleId: 'some-vehicle-id',
          deliveryDate: new Date().toISOString(),
          items: [],
        })
        .expect(422); // validation error — driverId is required

      expect(res.body.success).toBe(false);
    });

    it('rejects inactive driver', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 100);
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');
      const order = await seedOrder(customer.id, address.id);
      const orderItem = await seedOrderItem(order.id, product.id, 10, '25.00');

      const driver = await getTestPrisma().driver.create({
        data: {
          name: 'Inactive Driver',
          phone: '0711111111',
          nationalId: '11111111',
          nationalIdNormalized: '11111111',
          isActive: false,
        },
      });
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 888Z', vehicleOwner.id);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [{ orderItemId: orderItem.id, productId: product.id, plannedQuantity: 5 }],
        })
        .expect(422);

      expect(res.body.error.message).toContain('inactive');
    });

    it('rejects inactive vehicle', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 100);
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');
      const order = await seedOrder(customer.id, address.id);
      const orderItem = await seedOrderItem(order.id, product.id, 10, '25.00');
      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');

      const vehicle = await getTestPrisma().vehicle.create({
        data: {
          registrationNumber: 'KZZ 777Z',
          registrationNormalized: 'KZZ777Z',
          vehicleType: 'Truck',
          vehicleOwnerId: vehicleOwner.id,
          isActive: false,
        },
      });

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [{ orderItemId: orderItem.id, productId: product.id, plannedQuantity: 5 }],
        })
        .expect(422);

      expect(res.body.error.message).toContain('inactive');
    });

    it('rejects quantity exceeding remainingQuantity', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 100);
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');
      const order = await seedOrder(customer.id, address.id);
      const orderItem = await seedOrderItem(order.id, product.id, 10, '25.00');
      // remainingQuantity = 10, but we request 15
      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 666Z', vehicleOwner.id);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [{ orderItemId: orderItem.id, productId: product.id, plannedQuantity: 15 }],
        })
        .expect(422);

      expect(res.body.error.message).toContain('exceeds remaining quantity');
    });

    it('rejects quantity exceeding available stock', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 10); // only 10 available
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      // allocatedQuantity needs to be set so the check passes that layer
      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8002',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'CREDIT',
          totalAmount: '5000.00',
          items: {
            create: {
              productId: product.id,
              quantity: 200,
              agreedUnitPrice: '25.00',
              lineTotal: '5000.00',
              remainingQuantity: 200,
              allocatedQuantity: 200,
              sortOrder: 1,
            },
          },
        },
        include: { items: true },
      });

      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 555Z', vehicleOwner.id);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            { orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 50 },
          ],
        })
        .expect(422);

      expect(res.body.error.message).toContain('Not enough available stock');
    });

    it('rejects cancelled order', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 100);
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8003',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'CREDIT',
          status: 'CANCELLED',
          statusReason: 'Test cancellation',
          totalAmount: '0',
        },
      });

      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 444Z', vehicleOwner.id);

      await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [],
        })
        .expect(422);
    });

    it('rejects duplicate orderItemId in the request body', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 100);
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');
      const order = await seedOrder(customer.id, address.id);
      const orderItem = await seedOrderItem(order.id, product.id, 50, '25.00');
      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 333Z', vehicleOwner.id);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            { orderItemId: orderItem.id, productId: product.id, plannedQuantity: 5 },
            { orderItemId: orderItem.id, productId: product.id, plannedQuantity: 10 },
          ],
        })
        .expect(422);

      expect(res.body.error.message).toContain('same order item');
    });

    it('allows future delivery dates', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 100);
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8004',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'PREPAID',
          totalAmount: '2500.00',
          items: {
            create: {
              productId: product.id,
              quantity: 100,
              agreedUnitPrice: '25.00',
              lineTotal: '2500.00',
              remainingQuantity: 100,
              allocatedQuantity: 100,
              sortOrder: 1,
            },
          },
        },
        include: { items: true },
      });

      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 222Z', vehicleOwner.id);

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: futureDate.toISOString(),
          items: [
            { orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 10 },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it('PREPAID order delivery succeeds without credit check', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Test Block');
      await seedFinishedStock(product.id, 100);
      const customer = await seedCustomer('Test Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      // Give customer a BLOCKED-level opening balance
      await getTestPrisma().customerOpeningBalance.create({
        data: { customerId: customer.id, amount: '2000000.00', effectiveDate: new Date(), reason: 'Test' },
      });

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8005',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'PREPAID',
          totalAmount: '2500.00',
          items: {
            create: {
              productId: product.id,
              quantity: 100,
              agreedUnitPrice: '25.00',
              lineTotal: '2500.00',
              remainingQuantity: 100,
              allocatedQuantity: 100,
              sortOrder: 1,
            },
          },
        },
        include: { items: true },
      });

      const driver = await seedDriver('Test Driver');
      const vehicleOwner = await seedVehicleOwner('Test Owner');
      const vehicle = await seedVehicle('KZZ 111Z', vehicleOwner.id);

      const res = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            { orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 10 },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // GET /deliveries — list
  // =========================================================================

  describe('GET /deliveries', () => {
    it('returns paginated delivery list', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const res = await request(app)
        .get(DELIVERIES)
        .set(headers)
        .query({ page: 1, pageSize: 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('filters by status', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const res = await request(app)
        .get(`${DELIVERIES}?status=PLANNED`)
        .set(headers)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // GET /deliveries/:id — detail
  // =========================================================================

  describe('GET /deliveries/:id', () => {
    it('returns 404 for a non-existent delivery', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      await request(app)
        .get(`${DELIVERIES}/nonexistent`)
        .set(headers)
        .expect(404);
    });
  });
});
