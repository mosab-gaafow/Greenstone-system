import { z } from 'zod';
import { OrderPaymentArrangement, OrderStatus } from '../../generated/prisma/client.js';

/**
 * Order request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. `lineTotal`, `totalAmount`, and `status` are never
 * accepted from a request — the backend calculates or controls all three.
 * Direct creation only (Phase 6C-2, 2026-08-02) — quotation conversion is
 * removed.
 */

const quantitySchema = z.coerce
  .number()
  .int('Quantity must be a whole number.')
  .positive('Quantity must be greater than zero.');

const unitPriceSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.')
  .refine((value) => Number(value) > 0, { message: 'Unit price must be greater than zero.' });

const orderItemSchema = z
  .object({
    productId: z.string().min(1, 'Select a product.'),
    quantity: quantitySchema,
    agreedUnitPrice: unitPriceSchema,
  })
  .strict();

export const orderIdParamsSchema = z.object({
  id: z.string().min(1, 'An order id is required.'),
});

export const createOrderBodySchema = z
  .object({
    customerId: z.string().min(1, 'Select a customer.'),
    customerAddressId: z.string().min(1, 'Select a delivery address.'),
    paymentArrangement: z.enum(OrderPaymentArrangement),
    items: z.array(orderItemSchema).min(1, 'An order must contain at least one item.'),
    creditOverrideReason: z
      .string()
      .trim()
      .max(500, 'Reason must be 500 characters or fewer.')
      .optional(),
  })
  .strict();

/** Cancellation requires a written reason — never optional. */
export const cancelOrderBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required to cancel an order.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .strict();

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  customerId: z.string().min(1).optional(),
  paymentArrangement: z.enum(OrderPaymentArrangement).optional(),
  status: z.enum(OrderStatus).optional(),
  sortBy: z.enum(['orderNumber', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
