import { z } from 'zod';

/**
 * Curing request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. There is no create schema — a curing record is only
 * ever created alongside its production item.
 */

export const curingIdParamsSchema = z.object({
  id: z.string().min(1, 'A curing record id is required.'),
});

export const changeCuringDurationBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .strict();

export const releaseCuringBodySchema = z
  .object({
    brokenQuantity: z.coerce
      .number()
      .int('Broken quantity must be a whole number.')
      .min(0, 'Broken quantity cannot be negative.')
      .optional(),
  })
  .strict();

export const listCuringQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['PENDING', 'RELEASED']).optional(),
  productId: z.string().min(1).optional(),
  sortBy: z.enum(['startedAt', 'plannedCompletion', 'createdAt']).default('plannedCompletion'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
