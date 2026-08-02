import { z } from 'zod';
import { CURING_DURATIONS, PRODUCTION_PURPOSES } from '../types/production.types';

/**
 * Production form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is
 * sent. The backend calculates every produced/usable/allocated/excess
 * quantity — none of that is entered here.
 */

export const productionItemFormSchema = z.object({
  productId: z.string().min(1, 'Select a product.'),
  pallets: z.coerce
    .number({ message: 'Enter the number of pallets.' })
    .int('Pallets must be a whole number.')
    .positive('Pallets must be greater than zero.'),
  brokenQuantity: z.coerce
    .number({ message: 'Enter a quantity.' })
    .int('Broken quantity must be a whole number.')
    .min(0, 'Broken quantity cannot be negative.'),
  curingDuration: z.enum(CURING_DURATIONS, { message: 'Select a curing duration.' }),
});

export const rawMaterialUsageFormSchema = z.object({
  rawMaterialId: z.string().min(1, 'Select a raw material.'),
  quantity: z
    .string()
    .trim()
    .min(1, 'Enter a quantity.')
    .regex(/^\d+(\.\d{1,3})?$/, 'Enter an amount with up to three decimal places.')
    .refine((value) => Number(value) > 0, { message: 'Quantity must be greater than zero.' }),
});

export const productionFormSchema = z
  .object({
    productionDate: z.string().min(1, 'Select a date.'),
    purpose: z.enum(PRODUCTION_PURPOSES, { message: 'Select a purpose.' }),
    orderId: z.string().optional(),
    items: z.array(productionItemFormSchema).min(1, 'Add at least one item.'),
    rawMaterialUsages: z.array(rawMaterialUsageFormSchema),
  })
  .superRefine((values, ctx) => {
    if (values.purpose === 'ORDER' && !values.orderId) {
      ctx.addIssue({ code: 'custom', path: ['orderId'], message: 'Select the order this production is for.' });
    }
  });

export type ProductionItemFormValues = z.infer<typeof productionItemFormSchema>;
export type ProductionFormInput = z.input<typeof productionFormSchema>;
export type ProductionFormValues = z.output<typeof productionFormSchema>;
