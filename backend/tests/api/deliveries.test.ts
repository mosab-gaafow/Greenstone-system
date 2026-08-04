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

    it('rejects inactive customer', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('InactiveCust Block', 100);
      await seedFinishedStock(product.id, 500);
      const customer = await getTestPrisma().customer.create({
        data: {
          name: 'Inactive Customer',
          phone: '0711111111',
          phoneNormalized: '254711111111',
          isActive: false,
        },
      });
      const address = await getTestPrisma().customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Site',
          labelNormalized: 'site',
          addressLine: 'Road',
          isActive: true,
        },
      });

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8010',
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
      const vehicle = await seedVehicle('KZZ 990Z', vehicleOwner.id);

      await request(app)
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
        .expect(422);
    });

    it('succeeds when allocated is 0 but stock is available (stock-first)', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('StockFirst Block', 100);
      await seedFinishedStock(product.id, 50);
      const customer = await seedCustomer('StockFirst Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8011',
          customerId: customer.id, customerAddressId: address.id,
          addressLabel: address.label, addressLine: address.addressLine,
          paymentArrangement: 'PREPAID', totalAmount: '20.00',
          items: { create: { productId: product.id, quantity: 100, agreedUnitPrice: '0.20', lineTotal: '20.00', remainingQuantity: 100, allocatedQuantity: 0, sortOrder: 1 } },
        },
        include: { items: true },
      });

      const driver = await seedDriver('SF Driver');
      const vo = await seedVehicleOwner('SF Owner');
      const vehicle = await seedVehicle('KZZ 880Z', vo.id);

      await request(app).post(DELIVERIES).set(headers).send({
        orderId: order.id, customerAddressId: address.id, driverId: driver.id,
        vehicleId: vehicle.id, deliveryDate: new Date().toISOString(),
        items: [{ orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 8 }],
      }).expect(201);
    });

    it('rejects when stock is insufficient even with remaining quantity', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);
      const product = await seedProduct('LowStock Block', 100);
      await seedFinishedStock(product.id, 5);
      const customer = await seedCustomer('LowStock Customer');
      const address = await seedAddress(customer.id, 'Main Site');
      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8015', customerId: customer.id, customerAddressId: address.id,
          addressLabel: address.label, addressLine: address.addressLine,
          paymentArrangement: 'PREPAID', totalAmount: '200.00',
          items: { create: { productId: product.id, quantity: 1000, agreedUnitPrice: '0.20', lineTotal: '200.00', remainingQuantity: 1000, allocatedQuantity: 0, sortOrder: 1 } },
        },
        include: { items: true },
      });
      const driver = await seedDriver('LS Driver');
      const vo = await seedVehicleOwner('LS Owner');
      const vehicle = await seedVehicle('KZZ 870Z', vo.id);
      await request(app).post(DELIVERIES).set(headers).send({
        orderId: order.id, customerAddressId: address.id, driverId: driver.id,
        vehicleId: vehicle.id, deliveryDate: new Date().toISOString(),
        items: [{ orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 10 }],
      }).expect(422);
    });

    it('succeeds when allocated > 0 and stock covers the quantity', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('AllocOK Block', 100);
      await seedFinishedStock(product.id, 50);
      const customer = await seedCustomer('AllocOK Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-8012',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'PREPAID',
          totalAmount: '200.00',
          items: {
            create: {
              productId: product.id,
              quantity: 100,
              agreedUnitPrice: '2.00',
              lineTotal: '200.00',
              remainingQuantity: 100,
              allocatedQuantity: 50, // 50 allocated
              sortOrder: 1,
            },
          },
        },
        include: { items: true },
      });

      const driver = await seedDriver('AllocOK Driver');
      const vehicleOwner = await seedVehicleOwner('AllocOK Owner');
      const vehicle = await seedVehicle('KZZ 770Z', vehicleOwner.id);

      // 8 <= min(100, 50-0, 50) = 50 → should succeed
      await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            { orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 8 },
          ],
        })
        .expect(201);
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

  // =========================================================================
  // Phase 8B — Transport
  // =========================================================================

  describe('PATCH /deliveries/:id/transport', () => {
    async function seedPlannedDelivery() {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Transport Block', 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('Transport Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9001',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'PREPAID',
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

      const driver = await seedDriver('Transport Driver');
      const vehicleOwner = await seedVehicleOwner('Transport Owner');
      const vehicle = await seedVehicle('KZZ 800Z', vehicleOwner.id);

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
        .expect(201);

      return { deliveryId: res.body.data.id as string, cookie: adminCookie, headers };
    }

    it('auto-calculates trips for single-product delivery', async () => {
      const { deliveryId, headers } = await seedPlannedDelivery();

      const res = await request(app)
        .patch(`${DELIVERIES}/${deliveryId}/transport`)
        .set(headers)
        .send({ transportRate: '8500.00' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.numberOfTrips).toBe(1);
      expect(res.body.data.totalTransportCost).toBe('8500.00');
      expect(res.body.data.autoCalculated).toBe(true);
    });

    it('auto-calculates ceiling for trips', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Ceiling Block', 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('Ceiling Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9002',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'PREPAID',
          totalAmount: '7500.00',
          items: {
            create: {
              productId: product.id,
              quantity: 300,
              agreedUnitPrice: '25.00',
              lineTotal: '7500.00',
              remainingQuantity: 300,
              allocatedQuantity: 300,
              sortOrder: 1,
            },
          },
        },
        include: { items: true },
      });

      const driver = await seedDriver('Ceiling Driver');
      const vehicleOwner = await seedVehicleOwner('Ceiling Owner');
      const vehicle = await seedVehicle('KZZ 700Z', vehicleOwner.id);

      const delivery = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            { orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 150 },
          ],
        })
        .expect(201);

      const res = await request(app)
        .patch(`${DELIVERIES}/${delivery.body.data.id}/transport`)
        .set(headers)
        .send({ transportRate: '8500.00' })
        .expect(200);

      expect(res.body.data.numberOfTrips).toBe(2);
      expect(res.body.data.totalTransportCost).toBe('17000.00');
    });

    it('rejects auto-calc when maxPiecesPerTruck is null', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await getTestPrisma().product.create({
        data: {
          name: 'No Capacity Block',
          nameNormalized: 'no capacity block',
          category: 'HOLLOW_BLOCK',
          size: 'Test',
          piecesPerPallet: 12,
          maxPiecesPerTruck: null,
          isActive: true,
        },
      });
      await seedFinishedStock(product.id, 200);
      const customer = await seedCustomer('NoCap Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9003',
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

      const driver = await seedDriver('NoCap Driver');
      const vehicleOwner = await seedVehicleOwner('NoCap Owner');
      const vehicle = await seedVehicle('KZZ 600Z', vehicleOwner.id);

      const delivery = await request(app)
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
        .expect(201);

      await request(app)
        .patch(`${DELIVERIES}/${delivery.body.data.id}/transport`)
        .set(headers)
        .send({ transportRate: '8500.00' })
        .expect(422);
    });

    it('requires manual trips for mixed-product delivery', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product1 = await seedProduct('Mixed Block 1', 100);
      const product2 = await seedProduct('Mixed Block 2', 100);
      await seedFinishedStock(product1.id, 500);
      await seedFinishedStock(product2.id, 500);
      const customer = await seedCustomer('Mixed Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9004',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'PREPAID',
          totalAmount: '5000.00',
          items: {
            create: [
              {
                productId: product1.id,
                quantity: 100,
                agreedUnitPrice: '25.00',
                lineTotal: '2500.00',
                remainingQuantity: 100,
                allocatedQuantity: 100,
                sortOrder: 1,
              },
              {
                productId: product2.id,
                quantity: 100,
                agreedUnitPrice: '25.00',
                lineTotal: '2500.00',
                remainingQuantity: 100,
                allocatedQuantity: 100,
                sortOrder: 2,
              },
            ],
          },
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });

      const orderItem1 = order.items[0]!;
      const orderItem2 = order.items[1]!;

      const driver = await seedDriver('Mixed Driver');
      const vehicleOwner = await seedVehicleOwner('Mixed Owner');
      const vehicle = await seedVehicle('KZZ 500Z', vehicleOwner.id);

      const delivery = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            { orderItemId: orderItem1.id, productId: product1.id, plannedQuantity: 50 },
            { orderItemId: orderItem2.id, productId: product2.id, plannedQuantity: 30 },
          ],
        })
        .expect(201);

      // Without numberOfTrips — should reject
      await request(app)
        .patch(`${DELIVERIES}/${delivery.body.data.id}/transport`)
        .set(headers)
        .send({ transportRate: '8500.00' })
        .expect(422);

      // With numberOfTrips — should succeed
      const res = await request(app)
        .patch(`${DELIVERIES}/${delivery.body.data.id}/transport`)
        .set(headers)
        .send({ transportRate: '8500.00', numberOfTrips: 3 })
        .expect(200);

      expect(res.body.data.numberOfTrips).toBe(3);
      expect(res.body.data.totalTransportCost).toBe('25500.00');
      expect(res.body.data.autoCalculated).toBe(false);
    });

    it('rejects transport on non-PLANNED delivery', async () => {
      const { deliveryId, headers } = await seedPlannedDelivery();

      await getTestPrisma().delivery.update({
        where: { id: deliveryId },
        data: { status: 'DISPATCHED' },
      });

      await request(app)
        .patch(`${DELIVERIES}/${deliveryId}/transport`)
        .set(headers)
        .send({ transportRate: '8500.00' })
        .expect(409);
    });
  });

  // =========================================================================
  // Phase 8C — Dispatch
  // =========================================================================

  describe('POST /deliveries/:id/dispatch', () => {
    it('dispatches a PLANNED delivery and reduces stock', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Dispatch Block', 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('Dispatch Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9101',
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

      const driver = await seedDriver('Dispatch Driver');
      const vehicleOwner = await seedVehicleOwner('Dispatch Owner');
      const vehicle = await seedVehicle('KZZ 300Z', vehicleOwner.id);

      const delivery = await request(app)
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
        .expect(201);

      const deliveryId = delivery.body.data.id;

      // Verify stock before dispatch
      const before = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(before!.reservedQuantity).toBe(50);
      expect(before!.physicalQuantity).toBe(500);

      // Dispatch
      const res = await request(app)
        .post(`${DELIVERIES}/${deliveryId}/dispatch`)
        .set(headers)
        .expect(200);

      expect(res.body.data.status).toBe('DISPATCHED');
      expect(res.body.data.dispatchedAt).toBeDefined();

      // Verify stock after dispatch
      const after = await getTestPrisma().finishedStockBalance.findUnique({
        where: { productId: product.id },
      });
      expect(after!.reservedQuantity).toBe(0);
      expect(after!.physicalQuantity).toBe(450);
      expect(after!.availableQuantity).toBe(450);

      // Verify movement was written
      const movements = await getTestPrisma().finishedStockMovement.findMany({
        where: { productId: product.id, movementType: 'DELIVERY_DISPATCH' },
      });
      expect(movements).toHaveLength(1);
      expect(movements[0]!.quantity).toBe(-50);

      // Verify delivery status
      const updated = await request(app)
        .get(`${DELIVERIES}/${deliveryId}`)
        .set('Cookie', adminCookie)
        .expect(200);
      expect(updated.body.data.status).toBe('DISPATCHED');
    });

    it('blocks PREPAID delivery dispatch', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Prepaid Block', 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('Prepaid Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9102',
          customerId: customer.id,
          customerAddressId: address.id,
          addressLabel: address.label,
          addressLine: address.addressLine,
          paymentArrangement: 'PREPAID',
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

      const driver = await seedDriver('Prepaid Driver');
      const vehicleOwner = await seedVehicleOwner('Prepaid Owner');
      const vehicle = await seedVehicle('KZZ 200Z', vehicleOwner.id);

      const delivery = await request(app)
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
        .expect(201);

      await request(app)
        .post(`${DELIVERIES}/${delivery.body.data.id}/dispatch`)
        .set(headers)
        .expect(422);
    });

    it('prevents double dispatch', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Double Block', 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('Double Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9103',
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

      const driver = await seedDriver('Double Driver');
      const vehicleOwner = await seedVehicleOwner('Double Owner');
      const vehicle = await seedVehicle('KZZ 100Z', vehicleOwner.id);

      const delivery = await request(app)
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
        .expect(201);

      // First dispatch succeeds
      await request(app)
        .post(`${DELIVERIES}/${delivery.body.data.id}/dispatch`)
        .set(headers)
        .expect(200);

      // Second dispatch fails
      await request(app)
        .post(`${DELIVERIES}/${delivery.body.data.id}/dispatch`)
        .set(headers)
        .expect(409);
    });
  });

  // =========================================================================
  // Phase 8D — Completion
  // =========================================================================

  describe('POST /deliveries/:id/complete', () => {
    async function seedDispatchedDelivery() {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);

      const product = await seedProduct('Complete Block', 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('Complete Customer');
      const address = await seedAddress(customer.id, 'Main Site');

      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: 'ORD-2026-9201',
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

      const driver = await seedDriver('Complete Driver');
      const vehicleOwner = await seedVehicleOwner('Complete Owner');
      const vehicle = await seedVehicle('KZZ 050Z', vehicleOwner.id);

      const delivery = await request(app)
        .post(DELIVERIES)
        .set(headers)
        .send({
          orderId: order.id,
          customerAddressId: address.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          deliveryDate: new Date().toISOString(),
          items: [
            { orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 100 },
          ],
        })
        .expect(201);

      await request(app)
        .post(`${DELIVERIES}/${delivery.body.data.id}/dispatch`)
        .set(headers)
        .expect(200);

      return {
        deliveryId: delivery.body.data.id as string,
        orderItemId: order.items[0]!.id,
        productId: product.id,
        orderId: order.id,
        headers,
        adminCookie,
      };
    }

    it('completes a delivery with no breakage', async () => {
      const { deliveryId, orderItemId, headers, adminCookie } =
        await seedDispatchedDelivery();

      const res = await request(app)
        .post(`${DELIVERIES}/${deliveryId}/complete`)
        .set(headers)
        .send({
          items: [
            { orderItemId, deliveredQuantity: 100, brokenQuantity: 0 },
          ],
        })
        .expect(200);

      expect(res.body.data.status).toBe('DELIVERED');

      // Verify OrderItem was updated
      const orderItem = await getTestPrisma().orderItem.findUnique({
        where: { id: orderItemId },
      });
      expect(orderItem!.deliveredQuantity).toBe(100);
      expect(orderItem!.remainingQuantity).toBe(100); // 200 - 100

      // Verify delivery status
      const updated = await request(app)
        .get(`${DELIVERIES}/${deliveryId}`)
        .set('Cookie', adminCookie)
        .expect(200);
      expect(updated.body.data.status).toBe('DELIVERED');
    });

    it('completes with broken products recorded', async () => {
      const { deliveryId, orderItemId, headers } =
        await seedDispatchedDelivery();

      const res = await request(app)
        .post(`${DELIVERIES}/${deliveryId}/complete`)
        .set(headers)
        .send({
          items: [
            { orderItemId, deliveredQuantity: 90, brokenQuantity: 10 },
          ],
        })
        .expect(200);

      expect(res.body.data.status).toBe('DELIVERED');

      // Verify broken product was recorded
      const broken = await getTestPrisma().brokenProductRecord.findFirst({
        where: { stage: 'DELIVERY', relatedEntityId: deliveryId },
      });
      expect(broken).not.toBeNull();
      expect(broken!.quantity).toBe(10);

      // Verify OrderItem: only 90 delivered (not 100)
      const orderItem = await getTestPrisma().orderItem.findUnique({
        where: { id: orderItemId },
      });
      expect(orderItem!.deliveredQuantity).toBe(90);
    });

    it('rejects delivered + broken != dispatched', async () => {
      const { deliveryId, orderItemId, headers } = await seedDispatchedDelivery();

      await request(app)
        .post(`${DELIVERIES}/${deliveryId}/complete`)
        .set(headers)
        .send({
          items: [
            { orderItemId, deliveredQuantity: 80, brokenQuantity: 10 },
          ],
        })
        .expect(422); // 80 + 10 = 90 ≠ 100 dispatched
    });

    it('prevents double completion', async () => {
      const { deliveryId, orderItemId, headers } = await seedDispatchedDelivery();

      await request(app)
        .post(`${DELIVERIES}/${deliveryId}/complete`)
        .set(headers)
        .send({
          items: [
            { orderItemId, deliveredQuantity: 100, brokenQuantity: 0 },
          ],
        })
        .expect(200);

      await request(app)
        .post(`${DELIVERIES}/${deliveryId}/complete`)
        .set(headers)
        .send({
          items: [
            { orderItemId, deliveredQuantity: 100, brokenQuantity: 0 },
          ],
        })
        .expect(409);
    });
  });
});

  // =========================================================================
  // Phase 8E — Cancellation
  // =========================================================================

  describe('POST /deliveries/:id/cancel', () => {
    async function seedCancelDelivery() {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);
      const product = await seedProduct('CancelBlock-' + Math.random().toString(36).slice(2,8), 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('CancelCust' + Math.random().toString(36).slice(2,6));
      const address = await seedAddress(customer.id, 'Site');
      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: `ORD-2026-${String(9400 + Math.floor(Math.random() * 100))}`,
          customerId: customer.id, customerAddressId: address.id,
          addressLabel: address.label, addressLine: address.addressLine,
          paymentArrangement: 'CREDIT', totalAmount: '5000.00',
          items: { create: { productId: product.id, quantity: 200, agreedUnitPrice: '25.00', lineTotal: '5000.00', remainingQuantity: 200, allocatedQuantity: 200, sortOrder: 1 } },
        },
        include: { items: true },
      });
      const driver = await seedDriver('CancelDrv' + Math.random().toString(36).slice(2,6));
      const vo = await seedVehicleOwner('CancelVO' + Math.random().toString(36).slice(2,6));
      const vehicle = await seedVehicle('KZZ020' + Math.random().toString(36).slice(2,5), vo.id);
      const delivery = await request(app).post(DELIVERIES).set(headers).send({
        orderId: order.id, customerAddressId: address.id, driverId: driver.id,
        vehicleId: vehicle.id, deliveryDate: new Date().toISOString(),
        items: [{ orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 50 }],
      }).expect(201);
      return { deliveryId: delivery.body.data.id as string, productId: product.id, headers, adminCookie };
    }

    it('cancels PLANNED delivery and releases reserved stock', async () => {
      const { deliveryId, productId, headers, adminCookie } = await seedCancelDelivery();
      const before = await getTestPrisma().finishedStockBalance.findUnique({ where: { productId } });
      expect(before!.reservedQuantity).toBe(50);

      const res = await request(app).post(`${DELIVERIES}/${deliveryId}/cancel`)
        .set(headers).send({ reason: 'Customer requested cancellation' }).expect(200);
      expect(res.body.data.status).toBe('CANCELLED');

      const after = await getTestPrisma().finishedStockBalance.findUnique({ where: { productId } });
      expect(after!.reservedQuantity).toBe(0);
      expect(after!.physicalQuantity).toBe(before!.physicalQuantity);

      const updated = await request(app).get(`${DELIVERIES}/${deliveryId}`).set('Cookie', adminCookie).expect(200);
      expect(updated.body.data.status).toBe('CANCELLED');
    });

    it('rejects cancellation without a reason', async () => {
      const { deliveryId, headers } = await seedCancelDelivery();
      await request(app).post(`${DELIVERIES}/${deliveryId}/cancel`).set(headers).send({}).expect(422);
    });

    it('rejects cancelling a DISPATCHED delivery', async () => {
      const { deliveryId, headers } = await seedCancelDelivery();
      await getTestPrisma().delivery.update({ where: { id: deliveryId }, data: { status: 'DISPATCHED' } });
      await request(app).post(`${DELIVERIES}/${deliveryId}/cancel`).set(headers).send({ reason: 'x' }).expect(409);
    });

    it('rejects double cancellation', async () => {
      const { deliveryId, headers } = await seedCancelDelivery();
      await request(app).post(`${DELIVERIES}/${deliveryId}/cancel`).set(headers).send({ reason: 'a' }).expect(200);
      await request(app).post(`${DELIVERIES}/${deliveryId}/cancel`).set(headers).send({ reason: 'b' }).expect(409);
    });
  });

  // =========================================================================
  // Phase 8F — Correction
  // =========================================================================

  describe('POST /deliveries/:id/correct', () => {
    async function seedDispatchedForCorrection() {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);
      const product = await seedProduct('Correct' + Math.random().toString(36).slice(2,6), 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('Correct' + Math.random().toString(36).slice(2,6));
      const address = await seedAddress(customer.id, 'Site');
      const order = await getTestPrisma().order.create({
        data: {
          orderNumber: `ORD-2026-${String(9500 + Math.floor(Math.random() * 100))}`,
          customerId: customer.id, customerAddressId: address.id,
          addressLabel: address.label, addressLine: address.addressLine,
          paymentArrangement: 'CREDIT', totalAmount: '5000.00',
          items: { create: { productId: product.id, quantity: 200, agreedUnitPrice: '25.00', lineTotal: '5000.00', remainingQuantity: 200, allocatedQuantity: 200, sortOrder: 1 } },
        },
        include: { items: true },
      });
      const driver = await seedDriver('Correct' + Math.random().toString(36).slice(2,6));
      const vo = await seedVehicleOwner('Correct' + Math.random().toString(36).slice(2,6));
      const vehicle = await seedVehicle('CR' + Math.random().toString(36).slice(2,5).toUpperCase(), vo.id);
      const delivery = await request(app).post(DELIVERIES).set(headers).send({
        orderId: order.id, customerAddressId: address.id, driverId: driver.id,
        vehicleId: vehicle.id, deliveryDate: new Date().toISOString(),
        items: [{ orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 100 }],
      }).expect(201);
      await request(app).post(`${DELIVERIES}/${delivery.body.data.id}/dispatch`).set(headers).expect(200);
      return { deliveryId: delivery.body.data.id as string, orderItemId: order.items[0]!.id, productId: product.id, headers };
    }

    it('corrects dispatch quantity down and restores stock', async () => {
      const { deliveryId, orderItemId, productId, headers } = await seedDispatchedForCorrection();
      const before = await getTestPrisma().finishedStockBalance.findUnique({ where: { productId } });

      const res = await request(app).post(`${DELIVERIES}/${deliveryId}/correct`)
        .set(headers).send({ reason: 'Dispatched 100, should be 80', items: [{ orderItemId, dispatchedQuantity: 80 }] })
        .expect(200);
      expect(res.body.data.status).toBe('DISPATCHED');

      const after = await getTestPrisma().finishedStockBalance.findUnique({ where: { productId } });
      expect(after!.physicalQuantity).toBe(before!.physicalQuantity + 20); // returned 20

      const movements = await getTestPrisma().finishedStockMovement.findMany({
        where: { productId, movementType: 'CORRECTION' },
      });
      expect(movements).toHaveLength(1);
      expect(movements[0]!.quantity).toBe(20);
    });

    it('corrects dispatch quantity up and reduces stock further', async () => {
      const { deliveryId, orderItemId, headers } = await seedDispatchedForCorrection();
      await request(app).post(`${DELIVERIES}/${deliveryId}/correct`)
        .set(headers).send({ reason: 'Should be 120', items: [{ orderItemId, dispatchedQuantity: 120 }] })
        .expect(200);
    });

    it('rejects correction on PLANNED delivery', async () => {
      const { cookie: adminCookie } = await seedAdmin();
      const headers = await csrfHeaders(adminCookie);
      const product = await seedProduct('CorrPlan' + Math.random().toString(36).slice(2,6), 100);
      await seedFinishedStock(product.id, 500);
      const customer = await seedCustomer('CorrPlan' + Math.random().toString(36).slice(2,6));
      const address = await seedAddress(customer.id, 'Site');
      const order = await getTestPrisma().order.create({
        data: { orderNumber: `ORD-2026-${String(9600 + Math.floor(Math.random() * 100))}`, customerId: customer.id, customerAddressId: address.id, addressLabel: address.label, addressLine: address.addressLine, paymentArrangement: 'CREDIT', totalAmount: '5000.00', items: { create: { productId: product.id, quantity: 200, agreedUnitPrice: '25.00', lineTotal: '5000.00', remainingQuantity: 200, allocatedQuantity: 200, sortOrder: 1 } } },
        include: { items: true },
      });
      const driver = await seedDriver('CorrPlan' + Math.random().toString(36).slice(2,6));
      const vo = await seedVehicleOwner('CorrPlan' + Math.random().toString(36).slice(2,6));
      const vehicle = await seedVehicle('CP' + Math.random().toString(36).slice(2,5).toUpperCase(), vo.id);
      const delivery = await request(app).post(DELIVERIES).set(headers).send({
        orderId: order.id, customerAddressId: address.id, driverId: driver.id, vehicleId: vehicle.id, deliveryDate: new Date().toISOString(), items: [{ orderItemId: order.items[0]!.id, productId: product.id, plannedQuantity: 50 }],
      }).expect(201);
      await request(app).post(`${DELIVERIES}/${delivery.body.data.id}/correct`)
        .set(headers).send({ reason: 'x', items: [{ orderItemId: order.items[0]!.id, dispatchedQuantity: 10 }] })
        .expect(409);
    });

    it('rejects correction without a reason', async () => {
      const { deliveryId, orderItemId, headers } = await seedDispatchedForCorrection();
      await request(app).post(`${DELIVERIES}/${deliveryId}/correct`)
        .set(headers).send({ items: [{ orderItemId, dispatchedQuantity: 10 }] })
        .expect(422);
    });
  });
