import { z } from 'zod';

/**
 * Quotation form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend calculates and validates everything again and remains the only
 * authority — line totals and the quotation total shown while typing are a
 * preview only.
 */

export const quotationItemFormSchema = z.object({
  productId: z.string().min(1, 'Select a product.'),
  quantity: z.coerce
    .number({ message: 'Enter a quantity.' })
    .int('Quantity must be a whole number.')
    .positive('Quantity must be greater than zero.'),
  agreedUnitPrice: z
    .string()
    .trim()
    .min(1, 'Enter a unit price.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.')
    .refine((value) => Number(value) > 0, { message: 'Unit price must be greater than zero.' }),
});

export const quotationFormSchema = z.object({
  customerId: z.string().min(1, 'Select a customer.'),
  items: z.array(quotationItemFormSchema).min(1, 'Add at least one item.'),
});

export type QuotationItemFormValues = z.infer<typeof quotationItemFormSchema>;

/**
 * `quantity` uses `z.coerce.number()`, so the raw form state (what
 * `useForm`/`register` manage before submission) and the resolved value
 * (what `handleSubmit` hands to `onSubmit`) are different types — the input
 * is whatever the number input produced, the output is always a `number`.
 */
export type QuotationFormInput = z.input<typeof quotationFormSchema>;
export type QuotationFormValues = z.output<typeof quotationFormSchema>;

export const quotationStatusChangeSchema = z.object({
  reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
});

export type QuotationStatusChangeValues = z.infer<typeof quotationStatusChangeSchema>;
