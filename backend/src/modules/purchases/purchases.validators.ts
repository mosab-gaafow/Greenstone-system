import { z } from 'zod';
import { isNotFutureNairobiDate } from '../../shared/utils/nairobi.js';

/**
 * Purchase request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. `totalCost`/`lineTotal` are never accepted from a
 * request — the backend calculates all of them.
 *
 * Which fields a Purchase Item actually requires (the generic quantity/
 * unit-cost shape, or the Pumice volumetric shape) depends on which raw
 * material is referenced — that can only be checked after loading the raw
 * material, so this schema accepts either shape and `purchases.service.ts`
 * enforces the right one, the same "business validation belongs in
 * services" split `production.validators.ts` already follows for its own
 * per-product rules.
 */

const decimalString = (maxDecimals: number, message: string) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^\\d+(\\.\\d{1,${String(maxDecimals)}})?$`), message);

const quantitySchema = decimalString(3, 'Enter an amount with up to three decimal places.');
const moneySchema = decimalString(2, 'Enter an amount with up to two decimal places.');
const dimensionSchema = decimalString(3, 'Enter a dimension with up to three decimal places.');

const purchaseItemSchema = z
  .object({
    rawMaterialId: z.string().min(1, 'Select a raw material.'),
    quantity: quantitySchema.optional(),
    unitCost: moneySchema.optional(),
    lengthMetres: dimensionSchema.optional(),
    widthMetres: dimensionSchema.optional(),
    heightMetres: dimensionSchema.optional(),
    numberOfLoads: z.coerce
      .number()
      .int('Number of loads must be a whole number.')
      .positive('Number of loads must be greater than zero.')
      .optional(),
    ratePerCubicMetre: moneySchema.optional(),
  })
  .strict();

export const purchaseIdParamsSchema = z.object({
  id: z.string().min(1, 'A purchase id is required.'),
});

export const createPurchaseBodySchema = z
  .object({
    supplierId: z.string().min(1, 'Select a supplier.'),
    purchaseDate: z.coerce
      .date()
      .refine(isNotFutureNairobiDate, { message: 'Purchase date cannot be in the future.' }),
    reference: z.string().trim().max(150).optional(),
    items: z.array(purchaseItemSchema).min(1, 'Add at least one item.'),
  })
  .strict();

export const listPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  supplierId: z.string().min(1).optional(),
  rawMaterialId: z.string().min(1).optional(),
  sortBy: z.enum(['purchaseNumber', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
