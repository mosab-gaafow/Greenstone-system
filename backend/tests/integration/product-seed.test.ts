import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_PRODUCTS, seedInitialProducts } from '../../prisma/seed/production/products.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

/**
 * Production seed.
 *
 * The production seed may create required system data only. The confirmed
 * initial products qualify; demo business records never do.
 *
 * See business-blueprint sections 2.3 and 4.2.
 */

describe('production product seed', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('defines exactly the six approved products', () => {
    expect(INITIAL_PRODUCTS.map((product) => product.name)).toEqual([
      'Hollow Blocks 6 × 9',
      'Hollow Blocks 4 × 9',
      'Hollow Blocks 9 × 9',
      'Hollow Pot 380 × 200 × 150 mm',
      'Hollow Pot 380 × 200 × 200 mm',
      'Hollow Pot 380 × 200 × 300 mm',
    ]);
  });

  it('assigns the right category to each', () => {
    const blocks = INITIAL_PRODUCTS.filter((p) => p.category === 'HOLLOW_BLOCK');
    const pots = INITIAL_PRODUCTS.filter((p) => p.category === 'HOLLOW_POT');

    expect(blocks).toHaveLength(3);
    expect(pots).toHaveLength(3);
  });

  it('defines no price for any product', () => {
    for (const product of INITIAL_PRODUCTS) {
      expect(product).not.toHaveProperty('price');
      expect(Object.keys(product).sort()).toEqual(['category', 'name', 'size']);
    }
  });

  it('creates all six on an empty database', async () => {
    const result = await seedInitialProducts(getTestPrisma());

    expect(result).toEqual({ created: 6, skipped: 0 });
    expect(await getTestPrisma().product.count()).toBe(6);
  });

  it('is idempotent', async () => {
    await seedInitialProducts(getTestPrisma());
    const second = await seedInitialProducts(getTestPrisma());

    expect(second).toEqual({ created: 0, skipped: 6 });
    expect(await getTestPrisma().product.count()).toBe(6);
  });

  it('does not undo a deliberate change on a re-run', async () => {
    await seedInitialProducts(getTestPrisma());

    // Someone retires a product on purpose.
    await getTestPrisma().product.updateMany({
      where: { name: 'Hollow Blocks 4 × 9' },
      data: { isActive: false },
    });

    await seedInitialProducts(getTestPrisma());

    const product = await getTestPrisma().product.findFirst({
      where: { name: 'Hollow Blocks 4 × 9' },
    });

    // Re-running the seed must not resurrect it.
    expect(product?.isActive).toBe(false);
  });

  it('creates all products as active on a fresh install', async () => {
    await seedInitialProducts(getTestPrisma());

    expect(await getTestPrisma().product.count({ where: { isActive: true } })).toBe(6);
  });

  it('creates no other business records', async () => {
    await seedInitialProducts(getTestPrisma());

    // A production seed must never insert demo customers, employees, suppliers,
    // drivers, vehicles, balances, stock, payments or expenses.
    const [users, auditLogs, sequences] = await Promise.all([
      getTestPrisma().user.count(),
      getTestPrisma().auditLog.count(),
      getTestPrisma().documentSequence.count(),
    ]);

    expect(users).toBe(0);
    expect(auditLogs).toBe(0);
    expect(sequences).toBe(0);
  });
});
