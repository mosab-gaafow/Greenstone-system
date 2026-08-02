import { z } from 'zod';
import { OrderPaymentType } from '../../generated/prisma/client.js';

/**
 * Order request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. `lineTotal` and `totalAmount` are never accepted from a
 * request — the backend calculates both.
 *
 * `createOrderBodySchema` accepts exactly one of two shapes: a conversion
 * from an accepted quotation (`sourceQuotationId`), or a direct order
 * (`customerId` + `items`) — never both, never neither.
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
    customerId: z.string().min(1).optional(),
    sourceQuotationId: z.string().min(1).optional(),
    customerAddressId: z.string().min(1, 'Select a delivery address.'),
    paymentType: z.enum(OrderPaymentType),
    items: z.array(orderItemSchema).min(1, 'An order must contain at least one item.').optional(),
    creditOverrideReason: z
      .string()
      .trim()
      .max(500, 'Reason must be 500 characters or fewer.')
      .optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.sourceQuotationId !== undefined) {
      if (body.customerId !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['customerId'],
          message: 'Do not provide a customer when converting a quotation.',
        });
      }
      if (body.items !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['items'],
          message: 'Do not provide items when converting a quotation — they are copied from it.',
        });
      }
      return;
    }

    if (!body.customerId) {
      ctx.addIssue({
        code: 'custom',
        path: ['customerId'],
        message: 'Select a customer, or provide a source quotation instead.',
      });
    }
    if (!body.items || body.items.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'An order must contain at least one item.',
      });
    }
  });

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  customerId: z.string().min(1).optional(),
  paymentType: z.enum(OrderPaymentType).optional(),
  sortBy: z.enum(['orderNumber', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
