import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  INITIAL_MEASUREMENT_UNITS,
  INITIAL_RAW_MATERIALS,
  seedRawMaterialReferenceData,
} from '../../prisma/seed/production/raw-materials.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

/**
 * Production seed — raw-material reference data (Phase 7B).
 *
 * Cement, Dust, and Pumice, and their measurement units (Sack, Cubic Metre,
 * Tonne), are confirmed real system data (business-blueprint sections
 * 2.12–2.13), so they belong in the production seed — demo business records
 * never do. Mirrors tests/integration/product-seed.test.ts.
 */

describe('production raw-material reference seed', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('defines exactly the three approved measurement units', () => {
    expect(INITIAL_MEASUREMENT_UNITS.map((unit) => unit.name)).toEqual([
      'Sack',
      'Cubic Metre',
      'Tonne',
    ]);
  });

  it('defines exactly the three approved raw materials, each with its confirmed unit', () => {
    expect(INITIAL_RAW_MATERIALS).toEqual([
      { name: 'Cement', measurementUnitName: 'Sack' },
      { name: 'Dust', measurementUnitName: 'Tonne' },
      { name: 'Pumice', measurementUnitName: 'Cubic Metre' },
    ]);
  });

  it('creates all units and materials on an empty database', async () => {
    const result = await seedRawMaterialReferenceData(getTestPrisma());

    expect(result).toEqual({
      measurementUnits: { created: 3, skipped: 0 },
      rawMaterials: { created: 3, skipped: 0 },
    });
    expect(await getTestPrisma().measurementUnit.count()).toBe(3);
    expect(await getTestPrisma().rawMaterial.count()).toBe(3);
  });

  it('gives every raw material a zero-balance stock row', async () => {
    await seedRawMaterialReferenceData(getTestPrisma());

    const balances = await getTestPrisma().rawMaterialStockBalance.findMany();

    expect(balances).toHaveLength(3);
    expect(balances.every((balance) => balance.quantity.toNumber() === 0)).toBe(true);
  });

  it('connects each raw material to its confirmed measurement unit', async () => {
    await seedRawMaterialReferenceData(getTestPrisma());

    const cement = await getTestPrisma().rawMaterial.findUnique({
      where: { nameNormalized: 'cement' },
      include: { measurementUnit: true },
    });
    const dust = await getTestPrisma().rawMaterial.findUnique({
      where: { nameNormalized: 'dust' },
      include: { measurementUnit: true },
    });
    const pumice = await getTestPrisma().rawMaterial.findUnique({
      where: { nameNormalized: 'pumice' },
      include: { measurementUnit: true },
    });

    expect(cement?.measurementUnit.name).toBe('Sack');
    expect(dust?.measurementUnit.name).toBe('Tonne');
    expect(pumice?.measurementUnit.name).toBe('Cubic Metre');
  });

  it('leaves reorder level unset', async () => {
    await seedRawMaterialReferenceData(getTestPrisma());

    const materials = await getTestPrisma().rawMaterial.findMany();
    expect(materials.every((material) => material.reorderLevel === null)).toBe(true);
  });

  it('is idempotent', async () => {
    await seedRawMaterialReferenceData(getTestPrisma());
    const second = await seedRawMaterialReferenceData(getTestPrisma());

    expect(second).toEqual({
      measurementUnits: { created: 0, skipped: 3 },
      rawMaterials: { created: 0, skipped: 3 },
    });
    expect(await getTestPrisma().measurementUnit.count()).toBe(3);
    expect(await getTestPrisma().rawMaterial.count()).toBe(3);
  });

  it('does not undo a deliberate deactivation on a re-run', async () => {
    await seedRawMaterialReferenceData(getTestPrisma());

    await getTestPrisma().rawMaterial.updateMany({
      where: { name: 'Cement' },
      data: { isActive: false },
    });

    await seedRawMaterialReferenceData(getTestPrisma());

    const cement = await getTestPrisma().rawMaterial.findUnique({ where: { name: 'Cement' } });
    expect(cement?.isActive).toBe(false);
  });

  it('creates no other business records', async () => {
    await seedRawMaterialReferenceData(getTestPrisma());

    // A production seed must never insert demo customers, employees,
    // suppliers, drivers, vehicles, balances, payments or expenses.
    const [suppliers, users, auditLogs, sequences] = await Promise.all([
      getTestPrisma().supplier.count(),
      getTestPrisma().user.count(),
      getTestPrisma().auditLog.count(),
      getTestPrisma().documentSequence.count(),
    ]);

    expect(suppliers).toBe(0);
    expect(users).toBe(0);
    expect(auditLogs).toBe(0);
    expect(sequences).toBe(0);
  });
});
