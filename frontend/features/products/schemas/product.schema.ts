import { z } from 'zod';
import { PRODUCT_CATEGORIES } from '../types/product.types';

/**
 * Product form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend validates everything again and remains the only authority.
 *
 * `piecesPerPallet`/`maxPiecesPerTruck` are kept as optional strings, not
 * numbers — an empty string is how a plain text input represents "not
 * confirmed yet," and `products.api.ts`'s `normalise()` turns a blank value
 * into `null` for the request.
 */
const optionalPositiveIntegerField = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d+$/.test(value), {
    message: 'Enter a whole number greater than zero.',
  })
  .refine((value) => value === '' || Number(value) > 0, {
    message: 'Enter a whole number greater than zero.',
  })
  .optional();

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters.')
    .max(120, 'Product name must be 120 characters or fewer.')
    .transform((value) => value.replace(/\s+/g, ' ')),
  category: z.enum(PRODUCT_CATEGORIES, { message: 'Choose a category.' }),
  size: z
    .string()
    .trim()
    .min(1, 'Size is required.')
    .max(60, 'Size must be 60 characters or fewer.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer.')
    .optional(),
  operationalName: z
    .string()
    .trim()
    .max(60, 'Operational name must be 60 characters or fewer.')
    .optional(),
  piecesPerPallet: optionalPositiveIntegerField,
  maxPiecesPerTruck: optionalPositiveIntegerField,
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
