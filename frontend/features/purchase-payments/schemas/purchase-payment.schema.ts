import { z } from 'zod';
import { todayInNairobi } from '@/lib/format';
import { PAYMENT_METHODS } from '../types/purchase-payment.types';

/**
 * Purchase payment form validation. Mirrors the backend rules — see
 * `createPurchasePaymentBodySchema` in purchase-payments.validators.ts.
 *
 * The evidence file is deliberately not part of this schema — see
 * `components/forms/file-field.tsx`'s doc comment.
 */

const moneyString = z
  .string()
  .trim()
  .min(1, 'Enter an amount.')
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.');

export const allocationFormSchema = z.object({
  purchaseId: z.string().min(1, 'Select a purchase.'),
  allocatedAmount: moneyString,
});

export const purchasePaymentFormSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier.'),
  amount: moneyString,
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Select a payment method.' }),
  paymentReference: z
    .string()
    .trim()
    .min(1, 'Enter the payment reference or details.')
    .max(255, 'Reference must be 255 characters or fewer.'),
  paymentDate: z
    .string()
    .min(1, 'Select a date.')
    // Both are plain `YYYY-MM-DD` strings, so lexicographic comparison is
    // exact — mirrors the backend's `isNotFutureNairobiDate`.
    .refine((value) => value <= todayInNairobi(), { message: 'Payment date cannot be in the future.' }),
  allocations: z.array(allocationFormSchema),
});

export const reversePurchasePaymentFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type AllocationFormValues = z.infer<typeof allocationFormSchema>;
export type PurchasePaymentFormValues = z.infer<typeof purchasePaymentFormSchema>;
export type ReversePurchasePaymentFormValues = z.infer<typeof reversePurchasePaymentFormSchema>;
