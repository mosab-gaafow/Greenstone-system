import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const PURCHASES = `${API_BASE_PATH}/purchases`;

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

async function seedSupplier(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().supplier.create({
    data: {
      name: overrides.name ?? `Supplier ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: overrides.isActive ?? true,
    },
  });
}

async function seedUnit(name: string) {
  return getTestPrisma().measurementUnit.create({
    data: { name, nameNormalized: normalizeForComparison(name), isActive: true },
  });
}

async function seedRawMaterial(
  name: string,
  measurementUnitId: string,
  overrides: Partial<{ isActive: boolean }> = {},
) {
  return getTestPrisma().rawMaterial.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      measurementUnitId,
      isActive: overrides.isActive ?? true,
      stockBalance: { create: { quantity: 0 } },
    },
  });
}

async function seedCement() {
  const unit = await seedUnit('Sack');
  return seedRawMaterial('Cement', unit.id);
}

async function seedPumice() {
  const unit = await seedUnit('Cubic Metre');
  return seedRawMaterial('Pumice', unit.id);
}

async function seedDust() {
  const unit = await seedUnit('Tonne');
  return seedRawMaterial('Dust', unit.id);
}

describe('purchases module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(PURCHASES);

      expect(response.status).toBe(401);
    });

    it('lets an accountant create a purchase', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '100', unitCost: '850.00' }],
        });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set('Cookie', cookie)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      expect(response.status).toBe(403);
    });

    it('has no update or delete route', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const created = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      const patch = await request(app)
        .patch(`${PURCHASES}/${created.body.data.id}`)
        .set(headers)
        .send({ reference: 'edited' });
      const del = await request(app).delete(`${PURCHASES}/${created.body.data.id}`).set(headers);

      expect(patch.status).toBe(404);
      expect(del.status).toBe(404);
    });
  });

  describe('cement (generic quantity × unit-cost)', () => {
    it('calculates the line total and does not hard-code the reference price', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          reference: 'DN-001',
          items: [{ rawMaterialId: cement.id, quantity: '200', unitCost: '900.00' }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.totalCost).toBe('180000.00');
      expect(response.body.data.items[0]).toMatchObject({
        rawMaterialName: 'Cement',
        quantity: '200.000',
        unitCost: '900.00',
        lineTotal: '180000.00',
      });
    });

    it('rejects a missing quantity', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, unitCost: '850.00' }],
        });

      expect(response.status).toBe(422);
    });

    it('rejects Pumice-only fields on a Cement item', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [
            {
              rawMaterialId: cement.id,
              quantity: '10',
              unitCost: '850.00',
              numberOfLoads: 2,
            },
          ],
        });

      expect(response.status).toBe(422);
    });
  });

  describe('pumice (cubic-metre calculation)', () => {
    it('computes volume per load, total volume, and total cost', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const pumice = await seedPumice();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [
            {
              rawMaterialId: pumice.id,
              lengthMetres: '3',
              widthMetres: '2',
              heightMetres: '1.5',
              numberOfLoads: 4,
              ratePerCubicMetre: '1100.00',
            },
          ],
        });

      expect(response.status).toBe(201);
      // volumePerLoad = 3 × 2 × 1.5 = 9; totalVolume = 9 × 4 = 36; totalCost = 36 × 1100 = 39,600
      expect(response.body.data.items[0]).toMatchObject({
        rawMaterialName: 'Pumice',
        quantity: '36.000',
        unitCost: '1100.00',
        lineTotal: '39600.00',
        lengthMetres: '3.000',
        widthMetres: '2.000',
        heightMetres: '1.500',
        numberOfLoads: 4,
      });
      expect(response.body.data.totalCost).toBe('39600.00');
    });

    it('rejects a Pumice item missing a dimension', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const pumice = await seedPumice();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [
            {
              rawMaterialId: pumice.id,
              lengthMetres: '3',
              widthMetres: '2',
              numberOfLoads: 4,
              ratePerCubicMetre: '1100.00',
            },
          ],
        });

      expect(response.status).toBe(422);
    });

    it('rejects plain quantity/unit cost for a Pumice item', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const pumice = await seedPumice();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: pumice.id, quantity: '36', unitCost: '1100.00' }],
        });

      expect(response.status).toBe(422);
    });

    it('does not confuse the Pumice rate with an unrelated reference value', async () => {
      // The rate is always a request input, snapshotted per item — never a
      // backend constant, and never hard-coded anywhere in this module.
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const pumice = await seedPumice();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [
            {
              rawMaterialId: pumice.id,
              lengthMetres: '1',
              widthMetres: '1',
              heightMetres: '1',
              numberOfLoads: 1,
              ratePerCubicMetre: '1500.00',
            },
          ],
        });

      expect(response.body.data.items[0].unitCost).toBe('1500.00');
      expect(response.body.data.totalCost).toBe('1500.00');
    });
  });

  describe('dust (generic path, no fixed formula)', () => {
    it('accepts a plain quantity and unit cost in tonnes', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const dust = await seedDust();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: dust.id, quantity: '12.5', unitCost: '2000.00' }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.items[0]).toMatchObject({
        rawMaterialName: 'Dust',
        quantity: '12.500',
        unitCost: '2000.00',
        lineTotal: '25000.00',
      });
    });
  });

  describe('raw-material stock ledger', () => {
    it('credits the raw-material stock balance and writes a PURCHASE_RECEIPT movement', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '150', unitCost: '850.00' }],
        });

      const balance = await getTestPrisma().rawMaterialStockBalance.findUnique({
        where: { rawMaterialId: cement.id },
      });
      expect(balance?.quantity.toFixed(3)).toBe('150.000');

      const movement = await getTestPrisma().rawMaterialMovement.findFirst({
        where: { rawMaterialId: cement.id, movementType: 'PURCHASE_RECEIPT' },
      });
      expect(movement?.quantity.toFixed(3)).toBe('150.000');
      expect(movement?.balanceAfter.toFixed(3)).toBe('150.000');
    });

    it('accumulates stock across two purchases', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      for (const quantity of ['100', '50']) {
        await request(app)
          .post(PURCHASES)
          .set(headers)
          .send({
            supplierId: supplier.id,
            purchaseDate: '2026-01-05',
            items: [{ rawMaterialId: cement.id, quantity, unitCost: '850.00' }],
          });
      }

      const balance = await getTestPrisma().rawMaterialStockBalance.findUnique({
        where: { rawMaterialId: cement.id },
      });
      expect(balance?.quantity.toFixed(3)).toBe('150.000');
    });

    it('rejects an inactive raw material', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();
      await getTestPrisma().rawMaterial.update({
        where: { id: cement.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      expect(response.status).toBe(422);

      // No stock movement should have been written for a rejected purchase.
      const movement = await getTestPrisma().rawMaterialMovement.findFirst({
        where: { rawMaterialId: cement.id },
      });
      expect(movement).toBeNull();
    });

    it('rejects an unknown raw material', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: 'does-not-exist', quantity: '10', unitCost: '850.00' }],
        });

      expect(response.status).toBe(404);
    });
  });

  describe('purchase date', () => {
    it('rejects a future purchase date', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2999-01-01',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      expect(response.status).toBe(422);
    });

    it("accepts today's date", async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();
      const today = new Date().toISOString().slice(0, 10);

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: today,
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      expect(response.status).toBe(201);
    });
  });

  describe('supplier validation', () => {
    it('rejects an inactive supplier', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier({ isActive: false });
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      expect(response.status).toBe(422);
    });

    it('rejects an unknown supplier', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: 'does-not-exist',
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      expect(response.status).toBe(404);
    });

    it('rejects a purchase with no items', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({ supplierId: supplier.id, purchaseDate: '2026-01-05', items: [] });

      expect(response.status).toBe(422);
    });
  });

  describe('multi-item totals', () => {
    it('sums every item line total using safe decimal arithmetic', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();
      const dust = await seedDust();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [
            { rawMaterialId: cement.id, quantity: '10', unitCost: '850.55' },
            { rawMaterialId: dust.id, quantity: '5', unitCost: '1999.99' },
          ],
        });

      expect(response.status).toBe(201);
      // 10 × 850.55 = 8505.50; 5 × 1999.99 = 9999.95; total = 18505.45
      expect(response.body.data.totalCost).toBe('18505.45');
      expect(response.body.data.items).toHaveLength(2);
    });
  });

  describe('numbering', () => {
    it('issues sequential PUR-YYYY-#### numbers', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const first = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });
      const second = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-06',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      expect(first.body.data.purchaseNumber).toMatch(/^PUR-\d{4}-\d{4}$/);
      expect(second.body.data.purchaseNumber).not.toBe(first.body.data.purchaseNumber);
    });
  });

  describe('audit', () => {
    it('records the create with the actor and document number', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier();
      const cement = await seedCement();

      const response = await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_PURCHASE' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('purchases');
      expect(audit?.documentNumber).toBe(response.body.data.purchaseNumber);
    });
  });

  describe('listing', () => {
    it('filters by supplierId', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplierA = await seedSupplier({ name: 'Supplier A' });
      const supplierB = await seedSupplier({ name: 'Supplier B' });
      const cement = await seedCement();

      await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplierA.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });
      await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplierB.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '20', unitCost: '850.00' }],
        });

      const response = await request(app)
        .get(`${PURCHASES}?supplierId=${supplierA.id}`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].supplierName).toBe('Supplier A');
    });

    it('filters by rawMaterialId', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplier();
      const headers = await csrfHeaders(cookie);
      const cement = await seedCement();
      const dust = await seedDust();

      await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: cement.id, quantity: '10', unitCost: '850.00' }],
        });
      await request(app)
        .post(PURCHASES)
        .set(headers)
        .send({
          supplierId: supplier.id,
          purchaseDate: '2026-01-05',
          items: [{ rawMaterialId: dust.id, quantity: '5', unitCost: '2000.00' }],
        });

      const response = await request(app)
        .get(`${PURCHASES}?rawMaterialId=${dust.id}`)
        .set('Cookie', cookie);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].itemCount).toBe(1);
    });
  });

  describe('detail', () => {
    it('returns 404 for an unknown purchase', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .get(`${PURCHASES}/does-not-exist`)
        .set('Cookie', cookie);

      expect(response.status).toBe(404);
    });
  });
});
