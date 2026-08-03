import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizePhone } from '../../src/shared/utils/normalize.js';
import { createTestUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';
import type { RequestContext } from '../../src/shared/auth/auth-context.js';

/**
 * Confirms Phase 7D's explicit "remove the orphaned file if the transaction
 * fails" rule — a deliberate deviation from `documents.service.ts`'s own
 * generated-PDF pipeline, which accepts an orphaned file as a standard
 * tradeoff. Forces a transaction failure via a module mock (the repository's
 * insert is the last thing that runs before the audit write, so a failure
 * there reliably happens *after* the file has already been stored), since a
 * genuine concurrent/duplicate-number failure is impractical to arrange
 * deterministically in an integration test.
 *
 * `storeFile` is spied on (calling through to the real implementation) so
 * the test can capture the exact storage key used, since the `StoredFile`
 * database row itself is rolled back along with everything else and cannot
 * be queried afterwards to find it.
 */

let capturedStorageKey: string | undefined;

vi.mock('../../src/shared/storage/storage.service.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/shared/storage/storage.service.js')>();

  return {
    ...actual,
    storeFile: vi.fn(async (input: Parameters<typeof actual.storeFile>[0]) => {
      const result = await actual.storeFile(input);
      capturedStorageKey = result.storageKey;
      return result;
    }),
  };
});

vi.mock('../../src/modules/purchase-payments/purchase-payments.repository.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/modules/purchase-payments/purchase-payments.repository.js')>();

  return {
    ...actual,
    insertPurchasePayment: vi.fn().mockRejectedValue(new Error('Simulated transaction failure.')),
  };
});

async function seedSupplier() {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().supplier.create({
    data: { name: 'Evidence Cleanup Co', phone, phoneNormalized: normalizePhone(phone), isActive: true },
  });
}

async function adminContext(): Promise<RequestContext> {
  const user = await createTestUser('admin');

  return {
    user: { id: user.id, name: user.name, email: user.email, role: 'admin', banned: false },
    headers: new Headers(),
    requestId: 'test-request',
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  };
}

describe('purchase payment evidence — orphaned file cleanup', () => {
  beforeEach(async () => {
    await truncateAll();
    capturedStorageKey = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('removes the just-stored evidence file when the transaction fails', async () => {
    const { createPurchasePayment } = await import(
      '../../src/modules/purchase-payments/purchase-payments.service.js'
    );
    const { getStorageProvider } = await import('../../src/shared/storage/storage.service.js');

    const supplier = await seedSupplier();
    await getTestPrisma().supplierOpeningBalance.create({
      data: { supplierId: supplier.id, amount: '5000.00', effectiveDate: new Date('2026-01-01'), reason: 'Seed' },
    });
    const context = await adminContext();

    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

    await expect(
      createPurchasePayment(
        {
          supplierId: supplier.id,
          amount: '500.00',
          paymentMethod: 'MPESA',
          paymentReference: 'ABC123',
          paymentDate: new Date('2026-01-10'),
          allocations: [],
        },
        { content: jpegBytes, mimeType: 'image/jpeg', originalFileName: 'receipt.jpg' },
        context,
      ),
    ).rejects.toThrow('Simulated transaction failure.');

    // No PurchasePayment row exists — the transaction rolled back.
    expect(await getTestPrisma().purchasePayment.count()).toBe(0);

    // The file that was stored just before the transaction started must not
    // have been left behind as an orphan.
    expect(capturedStorageKey).toBeDefined();
    expect(await getStorageProvider().exists(capturedStorageKey as string)).toBe(false);
  });
});
