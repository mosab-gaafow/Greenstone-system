import { z } from 'zod';
import { ORDER_PAYMENT_TYPES } from '../types/order.types';

/**
 * Order form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend calculates and validates everything again and remains the only
 * authority — line totals and the order total shown while typing are a
 * preview only.
 *
 * One schema, two shapes, exactly like `createOrderBodySchema` on the
 * backend: either `sourceQuotationId` (conversion — items are copied, never
 * entered here) or `customerId` + `items` (a direct order), never both.
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

export const orderFormSchema = z
  .object({
    customerId: z.string().optional(),
    sourceQuotationId: z.string().optional(),
    customerAddressId: z.string().min(1, 'Select a delivery address.'),
    paymentType: z.enum(ORDER_PAYMENT_TYPES, { message: 'Select a payment type.' }),
    items: z.array(orderItemFormSchema).optional(),
    creditOverrideReason: z
      .string()
      .trim()
      .max(500, 'Reason must be 500 characters or fewer.')
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (values.sourceQuotationId) {
      return;
    }

    if (!values.customerId) {
      ctx.addIssue({ code: 'custom', path: ['customerId'], message: 'Select a customer.' });
    }
    if (!values.items || values.items.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'Add at least one item.' });
    }
  });

/**
 * `quantity` uses `z.coerce.number()`, so the raw form state and the resolved
 * value are different types — same reason as `QuotationFormInput`.
 */
export type OrderFormInput = z.input<typeof orderFormSchema>;
export type OrderFormValues = z.output<typeof orderFormSchema>;
