import { z } from 'zod';

/**
 * Driver form validation. Mirrors the backend rules.
 */
export const driverFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Driver name must be at least 2 characters.')
    .max(150, 'Driver name must be 150 characters or fewer.')
    .transform((value) => value.replace(/\s+/g, ' ')),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number.')
    .max(20, 'Phone number must be 20 characters or fewer.')
    .regex(/^[+\d][\d\s-]*$/, 'Use digits, spaces and hyphens only.')
    .refine((value) => value.replace(/\D/g, '').length >= 9, {
      message: 'Enter a complete phone number.',
    }),
  nationalId: z
    .string()
    .trim()
    .min(4, 'National ID must be at least 4 characters.')
    .max(20, 'National ID must be 20 characters or fewer.'),
});

export type DriverFormValues = z.infer<typeof driverFormSchema>;
