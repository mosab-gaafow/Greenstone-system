import { z } from 'zod';

/**
 * Opening balance form validation. Mirrors the backend rules — see
 * `setSupplierOpeningBalanceBodySchema` in suppliers.validators.ts.
 *
 * Unlike the customer opening-balance form, a negative amount is rejected
 * here, not just left permissive — business-blueprint section 2.18 requires
 * a supplier opening balance to be zero or greater.
 */
export const supplierOpeningBalanceFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Enter an amount.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount of zero or greater, with up to two decimal places.'),
  effectiveDate: z.string().min(1, 'Select an effective date.'),
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type SupplierOpeningBalanceFormValues = z.infer<typeof supplierOpeningBalanceFormSchema>;
