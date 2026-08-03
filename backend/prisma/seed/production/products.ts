import { ProductCategory } from '../../../src/generated/prisma/client.js';
import type { DbClient } from '../../../src/shared/database/transaction.js';
import { normalizeForComparison } from '../../../src/shared/utils/normalize.js';

/**
 * Confirmed initial product definitions.
 *
 * These are approved system data, not demo data, so they belong in the
 * production seed. See business-blueprint section 2.3 and implementation-plan
 * Phase 4.
 *
 * Do not add a product here that is not approved, and never add a price —
 * products have none by design.
 */
export const INITIAL_PRODUCTS: {
  name: string;
  category: ProductCategory;
  size: string;
  /** Confirmed short name (business-blueprint section 2.3). Absent for the
   *  two Hollow Pot products whose operational name is deliberately empty. */
  operationalName?: string;
  /** Confirmed pieces one pallet holds. Absent where not yet confirmed. */
  piecesPerPallet?: number;
  /** Confirmed max pieces of this single product one truck can carry. */
  maxPiecesPerTruck?: number;
}[] = [
  {
    name: 'Hollow Blocks 6 × 9',
    category: ProductCategory.HOLLOW_BLOCK,
    size: '6 × 9',
    operationalName: '6-inch',
    piecesPerPallet: 12,
    maxPiecesPerTruck: 1200,
  },
  {
    name: 'Hollow Blocks 4 × 9',
    category: ProductCategory.HOLLOW_BLOCK,
    size: '4 × 9',
    operationalName: '4-inch',
    piecesPerPallet: 18,
    maxPiecesPerTruck: 1500,
  },
  {
    name: 'Hollow Blocks 9 × 9',
    category: ProductCategory.HOLLOW_BLOCK,
    size: '9 × 9',
    operationalName: '9-inch',
    // piecesPerPallet not confirmed — left absent, stays null.
    maxPiecesPerTruck: 850,
  },
  {
    name: 'Hollow Pot 380 × 200 × 150 mm',
    category: ProductCategory.HOLLOW_POT,
    size: '380 × 200 × 150 mm',
    // operationalName confirmed permanently empty — see business-blueprint
    // section 2.3. Do not add one without a fresh confirmation.
  },
  {
    name: 'Hollow Pot 380 × 200 × 200 mm',
    category: ProductCategory.HOLLOW_POT,
    size: '380 × 200 × 200 mm',
    // operationalName confirmed permanently empty — see business-blueprint
    // section 2.3. Do not add one without a fresh confirmation.
  },
  {
    name: 'Hollow Pot 380 × 200 × 300 mm',
    category: ProductCategory.HOLLOW_POT,
    size: '380 × 200 × 300 mm',
    operationalName: '300mm',
    piecesPerPallet: 6,
    maxPiecesPerTruck: 750,
  },
];

export interface SeedProductsResult {
  created: number;
  skipped: number;
}

/**
 * Creates any approved product that does not already exist.
 *
 * Idempotent, and deliberately never updates an existing row: a product may
 * have been renamed or deactivated on purpose, and a re-run of the seed must
 * not undo that.
 */
export async function seedInitialProducts(client: DbClient): Promise<SeedProductsResult> {
  let created = 0;
  let skipped = 0;

  for (const product of INITIAL_PRODUCTS) {
    const existing = await client.product.findUnique({
      where: { nameNormalized: normalizeForComparison(product.name) },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await client.product.create({
      data: {
        ...product,
        nameNormalized: normalizeForComparison(product.name),
        operationalNameNormalized: product.operationalName
          ? normalizeForComparison(product.operationalName)
          : null,
      },
    });
    created += 1;
  }

  return { created, skipped };
}
