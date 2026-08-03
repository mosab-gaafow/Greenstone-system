import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Customer and address request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored.
 */

/**
 * Phone numbers are kept permissive on purpose.
 *
 * Staff enter numbers in several shapes — 0722…, +254722…, with spaces or
 * hyphens — and rejecting a real customer's number because of formatting would
 * be worse than storing it as typed. Length and character set are checked; the
 * exact format is not.
 */
const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number.')
  .max(20, 'Phone number must be 20 characters or fewer.')
  .regex(/^[+\d][\d\s-]*$/, 'A phone number may contain digits, spaces and hyphens only.')
  // At least nine actual digits. The pattern above allows separators, so
  // "0-7-2-2-1-2" would otherwise pass as a phone number.
  .refine((value) => value.replace(/\D/g, '').length >= 9, {
    message: 'Enter a complete phone number.',
  })
  .transform(normalizeText);

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Customer name must be at least 2 characters.')
  .max(150, 'Customer name must be 150 characters or fewer.')
  // Stored collapsed, so "Kamau   Contractors" and "Kamau Contractors" cannot
  // become two records that merely look different.
  .transform(normalizeText);

const emailSchema = z.email('Enter a valid email address.').trim().max(150);

const labelSchema = z
  .string()
  .trim()
  .min(2, 'Give the site a short name.')
  .max(80, 'The site name must be 80 characters or fewer.')
  .transform(normalizeText);

const addressLineSchema = z
  .string()
  .trim()
  .min(2, 'Enter the address.')
  .max(200, 'The address must be 200 characters or fewer.')
  .transform(normalizeText);

const directionsSchema = z.string().trim().max(500, 'Directions must be 500 characters or fewer.');

export const customerIdParamsSchema = z.object({
  id: z.string().min(1, 'A customer id is required.'),
});

export const addressParamsSchema = z.object({
  id: z.string().min(1, 'A customer id is required.'),
  addressId: z.string().min(1, 'An address id is required.'),
});

export const forceDeactivateCustomerBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required to force-deactivate a customer.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .strict();

export const createCustomerBodySchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema.nullable().optional(),
  })
  .strict();

export const updateCustomerBodySchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const createAddressBodySchema = z
  .object({
    label: labelSchema,
    addressLine: addressLineSchema,
    directions: directionsSchema.nullable().optional(),
  })
  .strict();

export const updateAddressBodySchema = z
  .object({
    label: labelSchema.optional(),
    addressLine: addressLineSchema.optional(),
    directions: directionsSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  hasOutstandingBalance: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
