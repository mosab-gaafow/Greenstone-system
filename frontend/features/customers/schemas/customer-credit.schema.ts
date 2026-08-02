import { z } from 'zod';

/**
 * Opening balance form validation. Mirrors the backend rules — see
 * `setOpeningBalanceBodySchema` in customer-credit.validators.ts.
 */
export const openingBalanceFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Enter an amount.')
    .regex(/^-?\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.'),
  effectiveDate: z.string().min(1, 'Select an effective date.'),
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type OpeningBalanceFormValues = z.infer<typeof openingBalanceFormSchema>;
