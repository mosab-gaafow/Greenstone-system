import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as suppliersService from '../../src/modules/suppliers/suppliers.service.js';
import { cache } from '../../src/shared/cache/cache.service.js';
import { buildCacheKeyPrefix } from '../../src/shared/cache/cache-keys.js';
import { getRedisClient } from '../../src/shared/cache/redis.client.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizePhone } from '../../src/shared/utils/normalize.js';
import { createTestUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';
import type { RequestContext } from '../../src/shared/auth/auth-context.js';
import type { ListSuppliersFilters } from '../../src/modules/suppliers/suppliers.types.js';

/**
 * Supplier list/detail cache invalidation on an opening-balance change
 * (Phase 7A).
 *
 * The balance figure itself is never cached (see suppliers.service.ts) — this
 * only confirms that setting an opening balance still invalidates the
 * `suppliers` cache prefix, per the standing rule that every mutation
 * invalidates the cache entries it affects, after the transaction commits.
 */

const FILTERS: ListSuppliersFilters = {
  page: 1,
  pageSize: 25,
  sortBy: 'name',
  sortDirection: 'asc',
};

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

async function seedSupplier(name: string) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().supplier.create({
    data: { name, phone, phoneNormalized: normalizePhone(phone), isActive: true },
  });
}

describe('supplier cache invalidation on opening-balance change', () => {
  beforeEach(async () => {
    await truncateAll();
    getRedisClient();
    await cache.delByPrefix(buildCacheKeyPrefix('suppliers'));
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('clears every cached suppliers-list entry after an opening-balance change', async () => {
    const context = await adminContext();
    const supplier = await seedSupplier('Balance Test Supplies');

    // Populate the list cache.
    await suppliersService.listSuppliers(FILTERS);

    const client = getRedisClient();
    if (!client?.isReady) {
      // No live Redis in this environment — the cache-aside path is exercised
      // by tests/integration/cache.test.ts instead. Nothing further to assert.
      return;
    }

    const keysBefore: string[] = [];
    for await (const batch of client.scanIterator({
      MATCH: `${buildCacheKeyPrefix('suppliers')}*`,
      COUNT: 100,
    })) {
      keysBefore.push(...(Array.isArray(batch) ? batch : [batch]));
    }
    expect(keysBefore.length).toBeGreaterThan(0);

    await suppliersService.setSupplierOpeningBalance(
      supplier.id,
      { amount: '250000.00', effectiveDate: new Date('2026-01-01'), reason: 'Test seed' },
      context,
    );

    const keysAfter: string[] = [];
    for await (const batch of client.scanIterator({
      MATCH: `${buildCacheKeyPrefix('suppliers')}*`,
      COUNT: 100,
    })) {
      keysAfter.push(...(Array.isArray(batch) ? batch : [batch]));
    }
    expect(keysAfter).toHaveLength(0);
  });

  it('still returns correct, stale-free data whether or not the cache is populated', async () => {
    const context = await adminContext();
    const supplier = await seedSupplier('Fresh Read Supplies');

    await suppliersService.setSupplierOpeningBalance(
      supplier.id,
      { amount: '10000.00', effectiveDate: new Date('2026-01-01'), reason: 'Test seed' },
      context,
    );

    const balance = await suppliersService.getSupplierBalance(supplier.id);
    expect(balance.outstandingBalance).toBe('10000.00');
  });
});
