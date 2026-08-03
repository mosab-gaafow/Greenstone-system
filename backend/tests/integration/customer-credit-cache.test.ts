import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as customerCreditService from '../../src/modules/customer-credit/customer-credit.service.js';
import * as customersService from '../../src/modules/customers/customers.service.js';
import { cache } from '../../src/shared/cache/cache.service.js';
import { buildCacheKeyPrefix } from '../../src/shared/cache/cache-keys.js';
import { getRedisClient } from '../../src/shared/cache/redis.client.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizePhone } from '../../src/shared/utils/normalize.js';
import { createTestUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';
import type { RequestContext } from '../../src/shared/auth/auth-context.js';
import type { ListCustomersFilters } from '../../src/modules/customers/customers.types.js';

/**
 * Cross-module cache invalidation (Phase 6E).
 *
 * The customer list can now filter by outstanding balance, so setting an
 * opening balance — a `customer-credit` module write — must invalidate the
 * `customers` module's cached list, or a filtered list could stay stale for
 * up to the list's TTL.
 */

const FILTERS: ListCustomersFilters = {
  page: 1,
  pageSize: 25,
  sortBy: 'name',
  sortDirection: 'asc',
  hasOutstandingBalance: true,
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

async function seedCustomer(name: string) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().customer.create({
    data: { name, phone, phoneNormalized: normalizePhone(phone), isActive: true },
  });
}

describe('customer list cache invalidation on opening-balance change', () => {
  beforeEach(async () => {
    await truncateAll();
    getRedisClient();
    await cache.delByPrefix(buildCacheKeyPrefix('customers'));
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('serves a stale-free "has outstanding balance" list after a balance is set', async () => {
    const context = await adminContext();
    const customer = await seedCustomer('Balance Test Co');

    const before = await customersService.listCustomers(FILTERS);
    expect(before.totalRecords).toBe(0);

    await customerCreditService.setOpeningBalance(
      customer.id,
      { amount: '250000.00', effectiveDate: new Date('2026-01-01'), reason: 'Test seed' },
      context,
    );

    const after = await customersService.listCustomers(FILTERS);
    expect(after.totalRecords).toBe(1);
    expect(after.customers[0]?.name).toBe('Balance Test Co');
  });
});
