import { z } from 'zod';

/**
 * Measurement unit form validation. Mirrors the backend rules — see
 * measurement-units.validators.ts.
 */
export const measurementUnitFormSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required.').max(60, 'Name must be 60 characters or fewer.'),
  symbol: z.string().trim().max(10, 'Symbol must be 10 characters or fewer.').optional(),
});

export type MeasurementUnitFormValues = z.infer<typeof measurementUnitFormSchema>;
