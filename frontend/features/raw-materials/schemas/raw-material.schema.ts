import { z } from 'zod';

/**
 * Raw material form validation. Mirrors the backend rules — see
 * raw-materials.validators.ts. Quantities allow up to three decimal places,
 * unlike product pieces.
 */

const decimalPattern = /^\d+(\.\d{1,3})?$/;

export const rawMaterialFormSchema = z.object({
  name: z.string().trim().min(1, 'Raw material name is required.').max(120, 'Name must be 120 characters or fewer.'),
  measurementUnitId: z.string().min(1, 'Select a measurement unit.'),
  reorderLevel: z
    .string()
    .trim()
    .regex(decimalPattern, 'Enter an amount with up to three decimal places.')
    .optional()
    .or(z.literal('')),
});

export type RawMaterialFormValues = z.infer<typeof rawMaterialFormSchema>;

export const openingStockFormSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, 'Enter a quantity.')
    .regex(decimalPattern, 'Enter an amount with up to three decimal places.'),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer.').optional(),
});

export type OpeningStockFormValues = z.infer<typeof openingStockFormSchema>;

export const adjustStockFormSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, 'Enter a quantity.')
    .regex(/^-?\d+(\.\d{1,3})?$/, 'Enter an amount with up to three decimal places.'),
  reason: z.string().trim().min(1, 'A reason is required.').max(500, 'Reason must be 500 characters or fewer.'),
});

export type AdjustStockFormValues = z.infer<typeof adjustStockFormSchema>;
