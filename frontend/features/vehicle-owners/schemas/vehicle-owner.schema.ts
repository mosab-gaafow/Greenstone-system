import { z } from 'zod';

/**
 * Vehicle Owner form validation. Mirrors the backend rules.
 */
export const vehicleOwnerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Vehicle owner name must be at least 2 characters.')
    .max(150, 'Vehicle owner name must be 150 characters or fewer.')
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
    .max(20, 'National ID must be 20 characters or fewer.')
    .refine((value) => value === '' || value.length >= 4, {
      message: 'National ID must be at least 4 characters.',
    })
    .optional(),
});

export type VehicleOwnerFormValues = z.infer<typeof vehicleOwnerFormSchema>;
