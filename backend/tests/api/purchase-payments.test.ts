import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizePhone } from '../../src/shared/utils/normalize.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const PAYMENTS = `${API_BASE_PATH}/purchase-payments`;
const SUPPLIERS = `${API_BASE_PATH}/suppliers`;

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

async function seedOpeningBalance(supplierId: string, amount: string) {
  return getTestPrisma().supplierOpeningBalance.create({
    data: {
      supplierId,
      amount,
      effectiveDate: new Date('2026-01-01'),
      reason: 'Test seed',
    },
  });
}

async function seedPurchase(supplierId: string, totalCost: string, overrides: { purchaseNumber?: string } = {}) {
  return getTestPrisma().purchase.create({
    data: {
      purchaseNumber: overrides.purchaseNumber ?? `PUR-TEST-${Math.random().toString(36).slice(2, 10)}`,
      supplierId,
      purchaseDate: new Date('2026-01-05'),
      totalCost,
    },
  });
}

/** A supplier with an opening balance, ready to receive a payment against it. */
async function seedSupplierWithBalance(amount: string) {
  const supplier = await seedSupplier();
  await seedOpeningBalance(supplier.id, amount);
  return supplier;
}

const basePayment = (overrides: Record<string, unknown> = {}) => ({
  amount: '1000.00',
  paymentMethod: 'MPESA',
  paymentReference: 'QGH7XJ2K9L',
  paymentDate: '2026-01-10',
  ...overrides,
});

describe('purchase payments module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(PAYMENTS);
      expect(response.status).toBe(401);
    });

    it('lets an accountant create a payment', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('PENDING');
    });

    it('rejects an accountant approving a payment', async () => {
      const { cookie: adminCookie } = await createSignedInUser('admin');
      const adminHeaders = await csrfHeaders(adminCookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const created = await request(app)
        .post(PAYMENTS)
        .set(adminHeaders)
        .send(basePayment({ supplierId: supplier.id }));

      const { cookie: accountantCookie } = await createSignedInUser('accountant');
      const accountantHeaders = await csrfHeaders(accountantCookie);

      const response = await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/approve`)
        .set(accountantHeaders)
        .send({});

      expect(response.status).toBe(403);
    });

    it('rejects an accountant reversing a payment', async () => {
      const { cookie: adminCookie } = await createSignedInUser('admin');
      const adminHeaders = await csrfHeaders(adminCookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const created = await request(app)
        .post(PAYMENTS)
        .set(adminHeaders)
        .send(basePayment({ supplierId: supplier.id }));
      await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/approve`)
        .set(adminHeaders)
        .send({});

      const { cookie: accountantCookie } = await createSignedInUser('accountant');
      const accountantHeaders = await csrfHeaders(accountantCookie);

      const response = await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/reverse`)
        .set(accountantHeaders)
        .send({ reason: 'Test' });

      expect(response.status).toBe(403);
    });

    it('lets an admin approve and reverse', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));

      const approved = await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/approve`)
        .set(headers)
        .send({});
      expect(approved.status).toBe(200);
      expect(approved.body.data.status).toBe('APPROVED');

      const reversed = await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/reverse`)
        .set(headers)
        .send({ reason: 'Recorded in error' });
      expect(reversed.status).toBe(200);
      expect(reversed.body.data.status).toBe('REVERSED');
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set('Cookie', cookie)
        .send(basePayment({ supplierId: supplier.id }));

      expect(response.status).toBe(403);
    });

    it('never permanently deletes a payment', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));

      const del = await request(app).delete(`${PAYMENTS}/${created.body.data.id}`).set(headers);
      expect(del.status).toBe(404);
      expect(
        await getTestPrisma().purchasePayment.findUnique({ where: { id: created.body.data.id } }),
      ).not.toBeNull();
    });
  });

  describe('payment-method validation', () => {
    it('rejects a missing payment reference regardless of method', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, paymentReference: '' }));

      expect(response.status).toBe(422);
    });

    it.each(['MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE'])(
      'accepts %s with its required reference information',
      async (paymentMethod) => {
        const { cookie } = await createSignedInUser('admin');
        const headers = await csrfHeaders(cookie);
        const supplier = await seedSupplierWithBalance('5000.00');

        const response = await request(app)
          .post(PAYMENTS)
          .set(headers)
          .send(basePayment({ supplierId: supplier.id, paymentMethod, paymentReference: 'Reference details' }));

        expect(response.status).toBe(201);
        expect(response.body.data.paymentMethod).toBe(paymentMethod);
      },
    );
  });

  describe('payment amount vs supplier balance', () => {
    it('rejects a zero amount', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '0.00' }));

      expect(response.status).toBe(422);
    });

    it('rejects an amount exceeding the outstanding balance', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '1000.01' }));

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/exceeds/i);
    });

    it('accepts an amount exactly equal to the outstanding balance', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '1000.00' }));

      expect(response.status).toBe(201);
    });

    it('rejects a payment for an inactive supplier', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplier({ isActive: false });
      await seedOpeningBalance(supplier.id, '5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));

      expect(response.status).toBe(422);
    });

    it('does not reduce the supplier balance while PENDING', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      await request(app).post(PAYMENTS).set(headers).send(basePayment({ supplierId: supplier.id, amount: '2000.00' }));

      const balance = await request(app).get(`${SUPPLIERS}/${supplier.id}/balance`).set('Cookie', cookie);
      expect(balance.body.data.outstandingBalance).toBe('5000.00');
    });

    it('reduces the supplier balance once APPROVED', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '2000.00' }));
      await request(app).post(`${PAYMENTS}/${created.body.data.id}/approve`).set(headers).send({});

      const balance = await request(app).get(`${SUPPLIERS}/${supplier.id}/balance`).set('Cookie', cookie);
      expect(balance.body.data.outstandingBalance).toBe('3000.00');
    });

    it('restores the supplier balance once REVERSED', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '2000.00' }));
      await request(app).post(`${PAYMENTS}/${created.body.data.id}/approve`).set(headers).send({});
      await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/reverse`)
        .set(headers)
        .send({ reason: 'Recorded in error' });

      const balance = await request(app).get(`${SUPPLIERS}/${supplier.id}/balance`).set('Cookie', cookie);
      expect(balance.body.data.outstandingBalance).toBe('5000.00');
    });

    it('requires a reason to reverse', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));
      await request(app).post(`${PAYMENTS}/${created.body.data.id}/approve`).set(headers).send({});

      const response = await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/reverse`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('rejects approving an already-approved payment', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));
      await request(app).post(`${PAYMENTS}/${created.body.data.id}/approve`).set(headers).send({});

      const response = await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/approve`)
        .set(headers)
        .send({});

      expect(response.status).toBe(422);
    });

    it('rejects reversing a still-pending payment', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));

      const response = await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/reverse`)
        .set(headers)
        .send({ reason: 'Test' });

      expect(response.status).toBe(422);
    });

    it('re-validates the balance inside the approval transaction (simultaneous-request protection)', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('3000.00');

      // Two payments, each individually valid against the 3000 balance, but
      // not both — the second approval must be re-checked and rejected.
      const first = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '2000.00' }));
      const second = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '2000.00' }));

      const firstApproval = await request(app)
        .post(`${PAYMENTS}/${first.body.data.id}/approve`)
        .set(headers)
        .send({});
      expect(firstApproval.status).toBe(200);

      const secondApproval = await request(app)
        .post(`${PAYMENTS}/${second.body.data.id}/approve`)
        .set(headers)
        .send({});
      expect(secondApproval.status).toBe(422);
      expect(secondApproval.body.error.message).toMatch(/exceed/i);
    });
  });

  describe('allocations', () => {
    it('rejects an allocation to a purchase belonging to a different supplier', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const otherSupplier = await seedSupplier();
      const purchase = await seedPurchase(otherSupplier.id, '1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '500.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '500.00' }],
          }),
        );

      expect(response.status).toBe(422);
    });

    it('rejects a zero or negative allocation amount', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchase = await seedPurchase(supplier.id, '1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '500.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '0.00' }],
          }),
        );

      expect(response.status).toBe(422);
    });

    it("rejects an allocation exceeding the purchase's remaining unpaid amount", async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchase = await seedPurchase(supplier.id, '1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '1500.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '1000.01' }],
          }),
        );

      expect(response.status).toBe(422);
    });

    it('rejects allocating the same purchase twice in one payment', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchase = await seedPurchase(supplier.id, '1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '900.00',
            allocations: [
              { purchaseId: purchase.id, allocatedAmount: '500.00' },
              { purchaseId: purchase.id, allocatedAmount: '400.00' },
            ],
          }),
        );

      expect(response.status).toBe(422);
    });

    it('rejects total allocations exceeding the payment amount', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchaseA = await seedPurchase(supplier.id, '1000.00');
      const purchaseB = await seedPurchase(supplier.id, '1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '500.00',
            allocations: [
              { purchaseId: purchaseA.id, allocatedAmount: '300.00' },
              { purchaseId: purchaseB.id, allocatedAmount: '300.00' },
            ],
          }),
        );

      expect(response.status).toBe(422);
    });

    it('accepts a valid allocation and reports it in the payment detail', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchase = await seedPurchase(supplier.id, '1000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '600.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '600.00' }],
          }),
        );

      expect(response.status).toBe(201);
      expect(response.body.data.allocations).toHaveLength(1);
      expect(response.body.data.allocations[0]).toMatchObject({
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        allocatedAmount: '600.00',
      });
      expect(response.body.data.allocatedTotal).toBe('600.00');
    });

    it('counts only APPROVED allocations toward a purchase remaining unpaid', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchase = await seedPurchase(supplier.id, '1000.00');

      // First payment allocates 700, left PENDING — does not reduce what's
      // available for a second payment to allocate against the same purchase.
      const first = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '700.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '700.00' }],
          }),
        );
      expect(first.status).toBe(201);

      const second = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '900.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '900.00' }],
          }),
        );
      // Still allowed — the first payment's allocation is only PENDING.
      expect(second.status).toBe(201);

      // Now approve the first — the purchase has 700 approved, 300 remaining.
      await request(app).post(`${PAYMENTS}/${first.body.data.id}/approve`).set(headers).send({});

      // Approving the second (which allocated 900) must now be rejected —
      // re-validated fresh inside the approval transaction.
      const approveSecond = await request(app)
        .post(`${PAYMENTS}/${second.body.data.id}/approve`)
        .set(headers)
        .send({});
      expect(approveSecond.status).toBe(422);
    });
  });

  describe('payment date', () => {
    it('rejects a future payment date', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, paymentDate: '2999-01-01' }));

      expect(response.status).toBe(422);
    });

    it("accepts today's date", async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const today = new Date().toISOString().slice(0, 10);

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, paymentDate: today }));

      expect(response.status).toBe(201);
    });
  });

  describe('numbering', () => {
    it('issues sequential PPY-YYYY-#### numbers', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const first = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '100.00' }));
      const second = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '100.00' }));

      expect(first.body.data.paymentNumber).toMatch(/^PPY-\d{4}-\d{4}$/);
      expect(second.body.data.paymentNumber).not.toBe(first.body.data.paymentNumber);
    });
  });

  describe('audit', () => {
    it('records creation, approval, and reversal with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id }));
      await request(app).post(`${PAYMENTS}/${created.body.data.id}/approve`).set(headers).send({});
      await request(app)
        .post(`${PAYMENTS}/${created.body.data.id}/reverse`)
        .set(headers)
        .send({ reason: 'Recorded in error' });

      const created_ = await getTestPrisma().auditLog.findFirst({ where: { action: 'CREATE_PURCHASE_PAYMENT' } });
      const approved_ = await getTestPrisma().auditLog.findFirst({ where: { action: 'APPROVE_PURCHASE_PAYMENT' } });
      const reversed_ = await getTestPrisma().auditLog.findFirst({ where: { action: 'REVERSE_PURCHASE_PAYMENT' } });

      expect(created_?.userId).toBe(user.id);
      expect(created_?.module).toBe('purchase-payments');
      expect(approved_?.userId).toBe(user.id);
      expect(reversed_?.userId).toBe(user.id);
      expect(reversed_?.reason).toBe('Recorded in error');
    });
  });

  describe('separation from other financial records', () => {
    it('creates no side effect beyond the payment and its allocation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchase = await seedPurchase(supplier.id, '1000.00');

      await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '600.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '600.00' }],
          }),
        );

      // Purchase itself is never modified by a payment.
      const unchangedPurchase = await getTestPrisma().purchase.findUnique({ where: { id: purchase.id } });
      expect(unchangedPurchase?.totalCost.toFixed(2)).toBe('1000.00');
    });
  });

  describe('file upload evidence', () => {
    const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

    it('accepts a valid JPEG as evidence and serves it back only to an authenticated, permitted reader', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const created = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .field('supplierId', supplier.id)
        .field('amount', '500.00')
        .field('paymentMethod', 'MPESA')
        .field('paymentReference', 'ABC123')
        .field('paymentDate', '2026-01-10')
        .attach('evidenceFile', JPEG_BYTES, { filename: 'receipt.jpg', contentType: 'image/jpeg' });

      expect(created.status).toBe(201);
      expect(created.body.data.hasEvidence).toBe(true);

      const unauthenticated = await request(app).get(`${PAYMENTS}/${created.body.data.id}/evidence`);
      expect(unauthenticated.status).toBe(401);

      const authenticated = await request(app)
        .get(`${PAYMENTS}/${created.body.data.id}/evidence`)
        .set('Cookie', cookie);
      expect(authenticated.status).toBe(200);
      expect(authenticated.headers['content-type']).toContain('image/jpeg');
    });

    it('rejects a disallowed file type', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .field('supplierId', supplier.id)
        .field('amount', '500.00')
        .field('paymentMethod', 'MPESA')
        .field('paymentReference', 'ABC123')
        .field('paymentDate', '2026-01-10')
        .attach('evidenceFile', Buffer.from('not a real file'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        });

      expect(response.status).toBe(422);
    });

    it('rejects a file whose content does not match its declared type', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .field('supplierId', supplier.id)
        .field('amount', '500.00')
        .field('paymentMethod', 'MPESA')
        .field('paymentReference', 'ABC123')
        .field('paymentDate', '2026-01-10')
        .attach('evidenceFile', Buffer.from('this is plainly not a jpeg'), {
          filename: 'fake.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(422);
    });

    it('does not require an evidence file', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');

      const response = await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(basePayment({ supplierId: supplier.id, amount: '500.00' }));

      expect(response.status).toBe(201);
      expect(response.body.data.hasEvidence).toBe(false);
    });
  });

  describe('listing', () => {
    it('filters by supplierId', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplierA = await seedSupplierWithBalance('5000.00');
      const supplierB = await seedSupplierWithBalance('5000.00');

      await request(app).post(PAYMENTS).set(headers).send(basePayment({ supplierId: supplierA.id, amount: '100.00' }));
      await request(app).post(PAYMENTS).set(headers).send(basePayment({ supplierId: supplierB.id, amount: '100.00' }));

      const response = await request(app).get(`${PAYMENTS}?supplierId=${supplierA.id}`).set('Cookie', cookie);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].supplierId).toBe(supplierA.id);
    });

    it('filters by purchaseId for purchase-level payment history', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const supplier = await seedSupplierWithBalance('5000.00');
      const purchase = await seedPurchase(supplier.id, '1000.00');
      const otherPurchase = await seedPurchase(supplier.id, '1000.00');

      await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '400.00',
            allocations: [{ purchaseId: purchase.id, allocatedAmount: '400.00' }],
          }),
        );
      await request(app)
        .post(PAYMENTS)
        .set(headers)
        .send(
          basePayment({
            supplierId: supplier.id,
            amount: '400.00',
            allocations: [{ purchaseId: otherPurchase.id, allocatedAmount: '400.00' }],
          }),
        );

      const response = await request(app).get(`${PAYMENTS}?purchaseId=${purchase.id}`).set('Cookie', cookie);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('detail', () => {
    it('returns 404 for an unknown payment', async () => {
      const { cookie } = await createSignedInUser('admin');
      const response = await request(app).get(`${PAYMENTS}/does-not-exist`).set('Cookie', cookie);
      expect(response.status).toBe(404);
    });
  });
});
