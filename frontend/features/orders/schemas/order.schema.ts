import { z } from 'zod';
import { ORDER_PAYMENT_ARRANGEMENTS } from '../types/order.types';

/**
 * Order form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend calculates and validates everything again and remains the only
 * authority — line totals and the order total shown while typing are a
 * preview only.
 *
 * Direct creation only (Phase 6C-2, 2026-08-02) — quotation conversion was
 * removed.
 */

export const orderItemFormSchema = z.object({
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

export const orderFormSchema = z.object({
  customerId: z.string().min(1, 'Select a customer.'),
  customerAddressId: z.string().min(1, 'Select a delivery address.'),
  paymentArrangement: z.enum(ORDER_PAYMENT_ARRANGEMENTS, {
    message: 'Select a payment arrangement.',
  }),
  items: z.array(orderItemFormSchema).min(1, 'Add at least one item.'),
  creditOverrideReason: z
    .string()
    .trim()
    .max(500, 'Reason must be 500 characters or fewer.')
    .optional(),
});

/**
 * `quantity` uses `z.coerce.number()`, so the raw form state and the resolved
 * value are different types.
 */
export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormValues = z.output<typeof orderFormSchema>;

/** Cancellation requires a written reason — never optional. */
export const cancelOrderFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required to cancel an order.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type CancelOrderFormValues = z.output<typeof cancelOrderFormSchema>;
