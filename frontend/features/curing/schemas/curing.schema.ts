import { z } from 'zod';

/**
 * Curing form validation. Mirrors the backend rules — see
 * curing.validators.ts.
 */

export const changeCuringDurationFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required.')
    .max(500, 'Reason must be 500 characters or fewer.'),
});

export type ChangeCuringDurationFormValues = z.infer<typeof changeCuringDurationFormSchema>;

export const releaseCuringFormSchema = z.object({
  brokenQuantity: z.coerce
    .number()
    .int('Broken quantity must be a whole number.')
    .min(0, 'Broken quantity cannot be negative.'),
});

export type ReleaseCuringFormInput = z.input<typeof releaseCuringFormSchema>;
export type ReleaseCuringFormValues = z.output<typeof releaseCuringFormSchema>;
