import { z } from 'zod';
import { BrokenProductStage } from '../../generated/prisma/client.js';

/**
 * Broken product request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored. There is no update or delete schema — broken-product
 * records are append-only.
 */

export const createBrokenProductRecordBodySchema = z
  .object({
    productId: z.string().min(1, 'Select a product.'),
    quantity: z.coerce
      .number({ message: 'Enter a quantity.' })
      .int('Quantity must be a whole number.')
      .positive('Quantity must be greater than zero.'),
    stage: z.enum(BrokenProductStage),
    relatedEntityId: z.string().trim().min(1).nullable().optional(),
    reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').nullable().optional(),
  })
  .strict();

export const listBrokenProductRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  productId: z.string().min(1).optional(),
  stage: z.enum(BrokenProductStage).optional(),
});
