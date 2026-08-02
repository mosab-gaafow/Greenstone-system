import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Vehicle request schemas.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored — this is also what refuses `ownershipType`/`hireCost` on
 * a request: every vehicle is HIRED for the MVP, decided server-side, never
 * accepted from the client.
 */

const registrationNumberSchema = z
  .string()
  .trim()
  .min(2, 'Registration number must be at least 2 characters.')
  .max(20, 'Registration number must be 20 characters or fewer.')
  .transform(normalizeText);

const vehicleTypeSchema = z
  .string()
  .trim()
  .min(2, 'Vehicle type must be at least 2 characters.')
  .max(60, 'Vehicle type must be 60 characters or fewer.')
  .transform(normalizeText);

/**
 * Truck dimensions, in metres, up to two decimal places. Required — every
 * vehicle needs a known load capacity.
 *
 * Capped at 50m — far beyond any real truck, but without a bound a data-entry
 * slip (e.g. "600" instead of "6.00") multiplies out to a load figure that
 * overflows the database column, which previously surfaced as an opaque 500
 * error rather than a clear validation message.
 */
const dimensionSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a measurement with up to two decimal places.')
  .refine((value) => Number(value) > 0, { message: 'Dimensions must be greater than zero.' })
  .refine((value) => Number(value) <= 50, {
    message: 'Enter a realistic measurement in metres (up to 50).',
  });

export const vehicleIdParamsSchema = z.object({
  id: z.string().min(1, 'A vehicle id is required.'),
});

export const createVehicleBodySchema = z
  .object({
    registrationNumber: registrationNumberSchema,
    vehicleType: vehicleTypeSchema,
    truckLengthM: dimensionSchema,
    truckWidthM: dimensionSchema,
    truckHeightM: dimensionSchema,
  })
  .strict();

export const updateVehicleBodySchema = z
  .object({
    registrationNumber: registrationNumberSchema.optional(),
    vehicleType: vehicleTypeSchema.optional(),
    truckLengthM: dimensionSchema.optional(),
    truckWidthM: dimensionSchema.optional(),
    truckHeightM: dimensionSchema.optional(),
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
