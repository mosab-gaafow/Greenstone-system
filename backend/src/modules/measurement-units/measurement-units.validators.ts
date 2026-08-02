import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Measurement unit request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored.
 */

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Unit name is required.')
  .max(60, 'Unit name must be 60 characters or fewer.')
  .transform(normalizeText);

const symbolSchema = z
  .string()
  .trim()
  .max(10, 'Symbol must be 10 characters or fewer.')
  .transform(normalizeText);

export const measurementUnitIdParamsSchema = z.object({
  id: z.string().min(1, 'A measurement unit id is required.'),
});

export const createMeasurementUnitBodySchema = z
  .object({
    name: nameSchema,
    symbol: symbolSchema.nullable().optional(),
  })
  .strict();

export const updateMeasurementUnitBodySchema = z
  .object({
    name: nameSchema.optional(),
    symbol: symbolSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listMeasurementUnitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(60).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
