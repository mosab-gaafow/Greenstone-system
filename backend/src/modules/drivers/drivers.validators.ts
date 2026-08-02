import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Driver request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored.
 */

/** Same permissive shape as Customer phone — see customers.validators.ts. */
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
  .min(2, 'Driver name must be at least 2 characters.')
  .max(150, 'Driver name must be 150 characters or fewer.')
  .transform(normalizeText);

/**
 * National ID. Required and unique — kept permissive on format, since older
 * or alien ID cards are not always pure digits.
 */
const nationalIdSchema = z
  .string()
  .trim()
  .min(4, 'National ID must be at least 4 characters.')
  .max(20, 'National ID must be 20 characters or fewer.');

export const driverIdParamsSchema = z.object({
  id: z.string().min(1, 'A driver id is required.'),
});

export const createDriverBodySchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    nationalId: nationalIdSchema,
  })
  .strict();

export const updateDriverBodySchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    nationalId: nationalIdSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listDriversQuerySchema = z.object({
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
