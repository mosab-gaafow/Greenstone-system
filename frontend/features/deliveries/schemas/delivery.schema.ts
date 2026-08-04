import { z } from 'zod';

/**
 * Delivery form validation (Phase 8A).
 *
 * Mirrors the backend rules. `deliveryDate` does NOT have a max constraint
 * — future dates are allowed (handoff §9).
 */

export const deliveryItemFormSchema = z.object({
  orderItemId: z.string().min(1, 'Select an order item.'),
  productId: z.string().min(1),
  plannedQuantity: z.coerce
    .number({ message: 'Enter a quantity.' })
    .int('Quantity must be a whole number.')
    .positive('Quantity must be greater than zero.'),
});

export const deliveryFormSchema = z.object({
  orderId: z.string().min(1, 'Select an order.'),
  customerAddressId: z.string().min(1, 'Select a delivery address.'),
  driverId: z.string().min(1, 'Select a driver.'),
  vehicleId: z.string().min(1, 'Select a vehicle.'),
  deliveryDate: z.coerce.date({ message: 'Select a delivery date.' }),
  items: z.array(deliveryItemFormSchema).min(1, 'Add at least one delivery item.'),
  creditOverrideReason: z
    .string()
    .trim()
    .max(500, 'Reason must be 500 characters or fewer.')
    .optional(),
});

export type DeliveryFormInput = z.input<typeof deliveryFormSchema>;
export type DeliveryFormValues = z.output<typeof deliveryFormSchema>;

// --- Phase 8B: Transport -----------------------------------------------

export const transportFormSchema = z.object({
  transportRate: z
    .string()
    .trim()
    .min(1, 'Enter a transport rate.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.')
    .refine((v) => Number(v) > 0, 'Rate must be greater than zero.'),
  numberOfTrips: z.coerce
    .number()
    .int('Trips must be a whole number.')
    .positive('Trips must be at least 1.')
    .optional(),
});

export type TransportFormValues = z.output<typeof transportFormSchema>;
