import { z } from 'zod';

/**
 * Customer credit request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored.
 */

export const customerIdParamsSchema = z.object({
  id: z.string().min(1, 'A customer id is required.'),
});

export const setOpeningBalanceBodySchema = z
  .object({
    amount: z
      .string()
      .trim()
      .regex(/^-?\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.'),
    effectiveDate: z.coerce.date(),
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .strict();

export const getCreditProjectionQuerySchema = z.object({
  newOrderTotal: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.'),
});
