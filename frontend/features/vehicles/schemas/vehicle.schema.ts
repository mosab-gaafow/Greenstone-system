import { z } from 'zod';

/**
 * Vehicle form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend validates everything again and remains the only authority.
 *
 * No `ownershipType` or truck-dimension fields exist here — Phase 6F removed
 * them entirely. `vehicleOwnerId` is required.
 */
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
  vehicleOwnerId: z.string().min(1, 'Select a vehicle owner.'),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
