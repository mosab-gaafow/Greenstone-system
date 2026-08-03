import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Vehicle Owner request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored.
 */

/** Same permissive shape as Customer/Driver/Supplier phone. */
const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number.')
  .max(20, 'Phone number must be 20 characters or fewer.')
  .regex(/^[+\d][\d\s-]*$/, 'A phone number may contain digits, spaces and hyphens only.')
  .refine((value) => value.replace(/\D/g, '').length >= 9, {
    message: 'Enter a complete phone number.',
  })
  .transform(normalizeText);

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Vehicle owner name must be at least 2 characters.')
  .max(150, 'Vehicle owner name must be 150 characters or fewer.')
  .transform(normalizeText);

/** Optional, unlike Driver's — kept permissive on format, same reasoning. */
const nationalIdSchema = z
  .string()
  .trim()
  .min(4, 'National ID must be at least 4 characters.')
  .max(20, 'National ID must be 20 characters or fewer.');

export const vehicleOwnerIdParamsSchema = z.object({
  id: z.string().min(1, 'A vehicle owner id is required.'),
});

export const createVehicleOwnerBodySchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    // Nullable as well as optional, so a form that clears the field can send
    // null on create exactly as it does on update.
    nationalId: nationalIdSchema.nullable().optional(),
  })
  .strict();

export const updateVehicleOwnerBodySchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    // Null clears the national ID; undefined leaves it unchanged.
    nationalId: nationalIdSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listVehicleOwnersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
