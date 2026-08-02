import { z } from 'zod';

/**
 * Supplier form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend validates everything again and remains the only authority.
 */

const phone = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number.')
  .max(20, 'Phone number must be 20 characters or fewer.')
  .regex(/^[+\d][\d\s-]*$/, 'Use digits, spaces and hyphens only.')
  .refine((value) => value.replace(/\D/g, '').length >= 9, {
    message: 'Enter a complete phone number.',
  });

export const supplierFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Supplier name must be at least 2 characters.')
    .max(150, 'Supplier name must be 150 characters or fewer.')
    .transform((value) => value.replace(/\s+/g, ' ')),
  phone,
  email: z.union([z.literal(''), z.email('Enter a valid email address.')]).optional(),
  address: z.string().trim().max(300, 'The address must be 300 characters or fewer.').optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;
