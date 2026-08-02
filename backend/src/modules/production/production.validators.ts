import { z } from 'zod';
import { CuringDuration, ProductionPurpose } from '../../generated/prisma/client.js';

/**
 * Production request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. `producedQuantity`/`usableQuantity`/`allocatedQuantity`/
 * `excessQuantity` are never accepted from a request — the backend
 * calculates all of them.
 */

const productionItemSchema = z
  .object({
    productId: z.string().min(1, 'Select a product.'),
    pallets: z.coerce
      .number({ message: 'Enter the number of pallets.' })
      .int('Pallets must be a whole number.')
      .positive('Pallets must be greater than zero.'),
    brokenQuantity: z.coerce
      .number()
      .int('Broken quantity must be a whole number.')
      .min(0, 'Broken quantity cannot be negative.')
      .default(0),
    curingDuration: z.enum(CuringDuration),
  })
  .strict();

const rawMaterialUsageSchema = z
  .object({
    rawMaterialId: z.string().min(1, 'Select a raw material.'),
    quantity: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,3})?$/, 'Enter an amount with up to three decimal places.')
      .refine((value) => Number(value) > 0, { message: 'Quantity must be greater than zero.' }),
  })
  .strict();

export const productionIdParamsSchema = z.object({
  id: z.string().min(1, 'A production id is required.'),
});

export const createProductionBodySchema = z
  .object({
    productionDate: z.coerce.date(),
    purpose: z.enum(ProductionPurpose),
    orderId: z.string().min(1).optional(),
    items: z.array(productionItemSchema).min(1, 'Add at least one item.'),
    rawMaterialUsages: z.array(rawMaterialUsageSchema).default([]),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.purpose === 'ORDER' && !body.orderId) {
      ctx.addIssue({ code: 'custom', path: ['orderId'], message: 'Select the order this production is for.' });
    }
    if (body.purpose === 'GENERAL_STOCK' && body.orderId) {
      ctx.addIssue({
        code: 'custom',
        path: ['orderId'],
        message: 'General-stock production must not reference an order.',
      });
    }
  });

export const listProductionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  purpose: z.enum(ProductionPurpose).optional(),
  orderId: z.string().min(1).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED']).optional(),
  sortBy: z.enum(['productionNumber', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
