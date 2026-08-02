import { z } from 'zod';
import { PaymentMethod, SalaryFrequency } from '../../generated/prisma/client.js';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Employee request schemas.
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
  .min(2, 'Employee name must be at least 2 characters.')
  .max(150, 'Employee name must be 150 characters or fewer.')
  .transform(normalizeText);

const nationalIdSchema = z
  .string()
  .trim()
  .max(20, 'National ID must be 20 characters or fewer.')
  .transform(normalizeText);

const jobTitleSchema = z
  .string()
  .trim()
  .min(2, 'Job title must be at least 2 characters.')
  .max(100, 'Job title must be 100 characters or fewer.')
  .transform(normalizeText);

const salaryFrequencySchema = z.enum(
  Object.values(SalaryFrequency) as [SalaryFrequency, ...SalaryFrequency[]],
);

const paymentMethodSchema = z.enum(
  Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]],
);

/**
 * Money as a decimal string — never a JavaScript number, which cannot
 * represent currency exactly. Up to two decimal places, strictly positive.
 */
const salaryAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.')
  .refine((value) => Number(value) > 0, { message: 'Salary amount must be greater than zero.' });

export const employeeIdParamsSchema = z.object({
  id: z.string().min(1, 'An employee id is required.'),
});

export const createEmployeeBodySchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    nationalId: nationalIdSchema.nullable().optional(),
    jobTitle: jobTitleSchema,
    salaryFrequency: salaryFrequencySchema,
    salaryAmount: salaryAmountSchema,
    paymentMethod: paymentMethodSchema,
  })
  .strict();

export const updateEmployeeBodySchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema.optional(),
    nationalId: nationalIdSchema.nullable().optional(),
    jobTitle: jobTitleSchema.optional(),
    salaryFrequency: salaryFrequencySchema.optional(),
    salaryAmount: salaryAmountSchema.optional(),
    paymentMethod: paymentMethodSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  salaryFrequency: salaryFrequencySchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
