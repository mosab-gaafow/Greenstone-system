import { z } from 'zod';

/**
 * Finished stock form validation. Mirrors the backend rules — see
 * finished-stock.validators.ts. Quantities are whole numbers.
 */

export const openingFinishedStockFormSchema = z.object({
  quantity: z.coerce
    .number({ message: 'Enter a quantity.' })
    .int('Quantity must be a whole number.')
    .min(0, 'Opening quantity cannot be negative.'),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
});

export type OpeningFinishedStockFormValues = z.infer<typeof openingFinishedStockFormSchema>;
export type OpeningFinishedStockFormInput = z.input<typeof openingFinishedStockFormSchema>;

export const adjustFinishedStockFormSchema = z.object({
  quantity: z.coerce
    .number({ message: 'Enter a quantity.' })
    .int('Quantity must be a whole number.')
    .refine((value) => value !== 0, { message: 'Enter a non-zero quantity.' }),
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type AdjustFinishedStockFormValues = z.infer<typeof adjustFinishedStockFormSchema>;
export type AdjustFinishedStockFormInput = z.input<typeof adjustFinishedStockFormSchema>;

export const recordBrokenStockFormSchema = z.object({
  quantity: z.coerce
    .number({ message: 'Enter a quantity.' })
    .int('Quantity must be a whole number.')
    .positive('Quantity must be greater than zero.'),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
});

export type RecordBrokenStockFormValues = z.infer<typeof recordBrokenStockFormSchema>;
export type RecordBrokenStockFormInput = z.input<typeof recordBrokenStockFormSchema>;
