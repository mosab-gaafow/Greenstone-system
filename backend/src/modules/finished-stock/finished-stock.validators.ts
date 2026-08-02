import { z } from 'zod';

/**
 * Finished stock request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. Quantities are whole numbers — product pieces are never
 * fractional.
 */

export const productIdParamsSchema = z.object({
  id: z.string().min(1, 'A product id is required.'),
});

export const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const setOpeningStockBodySchema = z
  .object({
    quantity: z.coerce
      .number({ message: 'Enter a quantity.' })
      .int('Quantity must be a whole number.')
      .min(0, 'Opening quantity cannot be negative.'),
    reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
  })
  .strict();

export const adjustStockBodySchema = z
  .object({
    quantity: z.coerce
      .number({ message: 'Enter a quantity.' })
      .int('Quantity must be a whole number.')
      .refine((value) => value !== 0, { message: 'Enter a non-zero quantity.' }),
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .strict();
