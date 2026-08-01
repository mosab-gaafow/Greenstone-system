import { z } from 'zod';
import { PRODUCT_CATEGORIES } from '../types/product.types';

/**
 * Product form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend validates everything again and remains the only authority.
 */
export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters.')
    .max(120, 'Product name must be 120 characters or fewer.'),
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
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
