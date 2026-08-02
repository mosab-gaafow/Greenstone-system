import { z } from 'zod';

/**
 * Vehicle form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend validates everything again and remains the only authority.
 *
 * No `ownershipType` or `hireCost` field exists here — every vehicle is
 * HIRED, decided server-side. Dimensions are required, not optional.
 */

/** Capped at 50m — see vehicles.validators.ts on the backend for why. */
const dimension = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a measurement with up to two decimal places.')
  .refine((value) => Number(value) > 0, { message: 'Dimensions must be greater than zero.' })
  .refine((value) => Number(value) <= 50, {
    message: 'Enter a realistic measurement in metres (up to 50).',
  });

export const vehicleFormSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(2, 'Registration number must be at least 2 characters.')
    .max(20, 'Registration number must be 20 characters or fewer.'),
  vehicleType: z
    .string()
    .trim()
    .min(2, 'Vehicle type must be at least 2 characters.')
    .max(60, 'Vehicle type must be 60 characters or fewer.'),
  truckLengthM: dimension,
  truckWidthM: dimension,
  truckHeightM: dimension,
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
