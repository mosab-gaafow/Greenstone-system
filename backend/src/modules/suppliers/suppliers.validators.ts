import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Supplier request schemas.
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
  .min(2, 'Supplier name must be at least 2 characters.')
  .max(150, 'Supplier name must be 150 characters or fewer.')
  .transform(normalizeText);

const emailSchema = z.email('Enter a valid email address.').trim().max(150);

const addressSchema = z
  .string()
  .trim()
  .min(2, 'Enter the address.')
  .max(300, 'The address must be 300 characters or fewer.')
  .transform(normalizeText);

export const supplierIdParamsSchema = z.object({
  id: z.string().min(1, 'A supplier id is required.'),
});

export const createSupplierBodySchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema.nullable().optional(),
    address: addressSchema.nullable().optional(),
  })
  .strict();

export const updateSupplierBodySchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.nullable().optional(),
    address: addressSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listSuppliersQuerySchema = z.object({
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
