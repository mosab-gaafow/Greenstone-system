import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as productsService from '../../src/modules/products/products.service.js';
import { cache } from '../../src/shared/cache/cache.service.js';
import { buildCacheKeyPrefix } from '../../src/shared/cache/cache-keys.js';
import { getRedisClient } from '../../src/shared/cache/redis.client.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createTestUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';
import type { RequestContext } from '../../src/shared/auth/auth-context.js';
import type { ListProductsFilters } from '../../src/modules/products/products.types.js';

/**
 * Product list caching.
 *
 * Two things must hold: a write must invalidate the cache so nobody sees a
 * stale list, and the whole feature must behave correctly whether the cache is
 * available or not.
 */

const FILTERS: ListProductsFilters = {
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

describe('product list caching', () => {
  beforeEach(async () => {
    await truncateAll();
    // Start each test from an empty cache, so a previous test's entries cannot
    // be mistaken for a cache hit here.
    getRedisClient();
    await cache.delByPrefix(buildCacheKeyPrefix('products'));
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('returns the same result on a repeated read', async () => {
    await getTestPrisma().product.create({
      data: { name: 'Cached block', category: 'HOLLOW_BLOCK', size: '6 × 9' },
    });

    const first = await productsService.listProducts(FILTERS);
    const second = await productsService.listProducts(FILTERS);

    expect(second).toEqual(first);
    expect(second.totalRecords).toBe(1);
  });

  it('serves a stale-free list after a create', async () => {
    const context = await adminContext();

    await productsService.listProducts(FILTERS);

    await productsService.createProduct(
      { name: 'Newly added', category: 'HOLLOW_POT', size: '380' },
      context,
    );

    const after = await productsService.listProducts(FILTERS);

    expect(after.totalRecords).toBe(1);
    expect(after.products[0]?.name).toBe('Newly added');
  });

  it('serves a stale-free list after an update', async () => {
    const context = await adminContext();
    const created = await productsService.createProduct(
      { name: 'Before rename', category: 'HOLLOW_BLOCK', size: '6 × 9' },
      context,
    );

    await productsService.listProducts(FILTERS);
    await productsService.editProduct(created.id, { name: 'After rename' }, context);

    const after = await productsService.listProducts(FILTERS);

    expect(after.products[0]?.name).toBe('After rename');
  });

  it('serves a stale-free list after a deactivation', async () => {
    const context = await adminContext();
    const created = await productsService.createProduct(
      { name: 'To retire', category: 'HOLLOW_BLOCK', size: '6 × 9' },
      context,
    );

    await productsService.listProducts(FILTERS);
    await productsService.deactivateProduct(created.id, context);

    const after = await productsService.listProducts(FILTERS);

    expect(after.products[0]?.isActive).toBe(false);
  });

  it('keeps different filters in separate cache entries', async () => {
    await getTestPrisma().product.createMany({
      data: [
        { name: 'A block', category: 'HOLLOW_BLOCK', size: '6 × 9' },
        { name: 'A pot', category: 'HOLLOW_POT', size: '380' },
      ],
    });

    const blocks = await productsService.listProducts({ ...FILTERS, category: 'HOLLOW_BLOCK' });
    const pots = await productsService.listProducts({ ...FILTERS, category: 'HOLLOW_POT' });

    // A shared key would return the block list for both.
    expect(blocks.products[0]?.name).toBe('A block');
    expect(pots.products[0]?.name).toBe('A pot');
  });

  it('writes list entries under the products namespace', async () => {
    await getTestPrisma().product.create({
      data: { name: 'Namespaced', category: 'HOLLOW_BLOCK', size: '6 × 9' },
    });

    await productsService.listProducts(FILTERS);

    const client = getRedisClient();
    const keys: string[] = [];

    if (client?.isReady) {
      for await (const batch of client.scanIterator({
        MATCH: `${buildCacheKeyPrefix('products')}*`,
        COUNT: 100,
      })) {
        keys.push(...(Array.isArray(batch) ? batch : [batch]));
      }

      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0]).toMatch(/^greenstone:v1:test:products:list:/);
    }
  });

  it('returns correct data even when nothing is cached', async () => {
    await getTestPrisma().product.create({
      data: { name: 'Uncached', category: 'HOLLOW_BLOCK', size: '6 × 9' },
    });

    await cache.delByPrefix(buildCacheKeyPrefix('products'));

    const result = await productsService.listProducts(FILTERS);

    expect(result.products[0]?.name).toBe('Uncached');
  });
});
