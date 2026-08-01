import { z } from 'zod';

/**
 * Customer and address form validation.
 *
 * Mirrors the backend rules. The backend validates everything again and remains
 * the only authority.
 */

/**
 * Kept permissive on purpose: staff type 0722…, +254722…, and with spaces or
 * hyphens. Rejecting a real number over formatting would be worse than storing
 * it as entered.
 */
const phone = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number.')
  .max(20, 'Phone number must be 20 characters or fewer.')
  .regex(/^[+\d][\d\s-]*$/, 'Use digits, spaces and hyphens only.')
  // At least nine actual digits. The pattern allows separators, so "0-7-2-2"
  // would otherwise pass as a phone number.
  .refine((value) => value.replace(/\D/g, '').length >= 9, {
    message: 'Enter a complete phone number.',
  });

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters.')
    .max(150, 'Customer name must be 150 characters or fewer.')
    // Collapsed before sending, matching what the backend stores.
    .transform((value) => value.replace(/\s+/g, ' ')),
  phone,
  email: z.union([z.literal(''), z.email('Enter a valid email address.')]).optional(),
});

export const addressFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, 'Give the site a short name.')
    .max(80, 'The site name must be 80 characters or fewer.'),
  addressLine: z
    .string()
    .trim()
    .min(2, 'Enter the address.')
    .max(200, 'The address must be 200 characters or fewer.'),
  directions: z.string().trim().max(500, 'Directions must be 500 characters or fewer.').optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
export type AddressFormValues = z.infer<typeof addressFormSchema>;
