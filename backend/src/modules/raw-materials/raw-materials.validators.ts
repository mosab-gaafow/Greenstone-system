import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Raw material request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. Quantities are decimal strings with up to three decimal
 * places, matching the `Decimal(14, 3)` columns — raw-material quantities may
 * be fractional (kilograms, cubic metres, ...), unlike product pieces.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Raw material name is required.')
  .max(120, 'Name must be 120 characters or fewer.')
  .transform(normalizeText);

const reorderLevelSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,3})?$/, 'Enter an amount with up to three decimal places.')
  .refine((value) => Number(value) >= 0, { message: 'Reorder level cannot be negative.' });

export const rawMaterialIdParamsSchema = z.object({
  id: z.string().min(1, 'A raw material id is required.'),
});

export const createRawMaterialBodySchema = z
  .object({
    name: nameSchema,
    measurementUnitId: z.string().min(1, 'Select a measurement unit.'),
    reorderLevel: reorderLevelSchema.nullable().optional(),
  })
  .strict();

export const updateRawMaterialBodySchema = z
  .object({
    name: nameSchema.optional(),
    measurementUnitId: z.string().min(1).optional(),
    reorderLevel: reorderLevelSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listRawMaterialsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(120).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});

export const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const setOpeningStockBodySchema = z
  .object({
    quantity: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,3})?$/, 'Enter an amount with up to three decimal places.')
      .refine((value) => Number(value) >= 0, { message: 'Opening quantity cannot be negative.' }),
    reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
  })
  .strict();

export const adjustStockBodySchema = z
  .object({
    quantity: z
      .string()
      .trim()
      .regex(/^-?\d+(\.\d{1,3})?$/, 'Enter an amount with up to three decimal places.')
      .refine((value) => Number(value) !== 0, { message: 'Enter a non-zero quantity.' }),
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .strict();
