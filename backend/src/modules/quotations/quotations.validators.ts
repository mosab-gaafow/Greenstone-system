import { z } from 'zod';
import { QuotationStatus } from '../../generated/prisma/client.js';

/**
 * Quotation request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. `lineTotal` and `totalAmount` are never accepted from a
 * request — the backend calculates both.
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

const quotationItemSchema = z
  .object({
    productId: z.string().min(1, 'Select a product.'),
    quantity: quantitySchema,
    agreedUnitPrice: unitPriceSchema,
  })
  .strict();

const itemsSchema = z
  .array(quotationItemSchema)
  .min(1, 'A quotation must contain at least one item.');

export const quotationIdParamsSchema = z.object({
  id: z.string().min(1, 'A quotation id is required.'),
});

export const createQuotationBodySchema = z
  .object({
    customerId: z.string().min(1, 'Select a customer.'),
    items: itemsSchema,
  })
  .strict();

export const updateQuotationBodySchema = z
  .object({
    customerId: z.string().min(1).optional(),
    items: itemsSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

/** Rejection and cancellation accept an optional written reason. */
export const quotationStatusChangeBodySchema = z
  .object({
    reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
  })
  .strict();

export const listQuotationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  status: z.enum(QuotationStatus).optional(),
  customerId: z.string().min(1).optional(),
  sortBy: z.enum(['quotationNumber', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
