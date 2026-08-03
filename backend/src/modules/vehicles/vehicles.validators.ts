import { z } from 'zod';
import { formatRegistrationDisplay, normalizeText } from '../../shared/utils/normalize.js';

/**
 * Vehicle request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored — this also refuses `ownershipType` and any of the old
 * volumetric fields, all removed in Phase 6F.
 */

const registrationNumberSchema = z
  .string()
  .trim()
  .min(2, 'Registration number must be at least 2 characters.')
  .max(20, 'Registration number must be 20 characters or fewer.')
  .transform(formatRegistrationDisplay);

const vehicleTypeSchema = z
  .string()
  .trim()
  .min(2, 'Vehicle type must be at least 2 characters.')
  .max(60, 'Vehicle type must be 60 characters or fewer.')
  .transform(normalizeText);

const vehicleOwnerIdSchema = z.string().min(1, 'Select a vehicle owner.');

export const vehicleIdParamsSchema = z.object({
  id: z.string().min(1, 'A vehicle id is required.'),
});

export const createVehicleBodySchema = z
  .object({
    registrationNumber: registrationNumberSchema,
    vehicleType: vehicleTypeSchema,
    vehicleOwnerId: vehicleOwnerIdSchema,
  })
  .strict();

export const updateVehicleBodySchema = z
  .object({
    registrationNumber: registrationNumberSchema.optional(),
    vehicleType: vehicleTypeSchema.optional(),
    vehicleOwnerId: vehicleOwnerIdSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(60).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sortBy: z.enum(['registrationNumber', 'createdAt']).default('registrationNumber'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
