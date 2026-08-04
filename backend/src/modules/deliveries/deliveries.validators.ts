import { z } from 'zod';

/**
 * Delivery request schemas (Phase 8A).
 *
 * Bodies are `.strict()`. `deliveryDate` deliberately does NOT use
 * `isNotFutureNairobiDate` — a delivery is inherently scheduled for today
 * or later, so a future-date block would be a real regression
 * (handoff §9).
 */

export const deliveryIdParamsSchema = z.object({
  id: z.string().min(1, 'A delivery id is required.'),
});

const deliveryItemSchema = z
  .object({
    orderItemId: z.string().min(1, 'Select an order item.'),
    productId: z.string().min(1, 'A product id is required.'),
    plannedQuantity: z.coerce
      .number()
      .int('Quantity must be a whole number.')
      .positive('Quantity must be greater than zero.'),
  })
  .strict();

export const createDeliveryBodySchema = z
  .object({
    orderId: z.string().min(1, 'Select an order.'),
    customerAddressId: z.string().min(1, 'Select a delivery address.'),
    driverId: z.string().min(1, 'Select a driver.'),
    vehicleId: z.string().min(1, 'Select a vehicle.'),
    deliveryDate: z.coerce.date(),
    items: z.array(deliveryItemSchema).min(1, 'Add at least one delivery item.'),
    creditOverrideReason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  status: z.enum(['PLANNED', 'DISPATCHED', 'DELIVERED', 'CANCELLED']).optional(),
  customerId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  sortBy: z.enum(['deliveryNumber', 'createdAt', 'deliveryDate']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
