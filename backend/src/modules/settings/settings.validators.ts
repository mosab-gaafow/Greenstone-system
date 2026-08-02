import { z } from 'zod';
import { normalizeText } from '../../shared/utils/normalize.js';

/**
 * Company settings request schemas.
 *
 * Every field is optional and nullable — real company data is unknown during
 * development and is entered later, during production setup (business-
 * blueprint section 9.5). Sending `null` clears a field back to blank.
 */

const shortTextSchema = z.string().trim().max(150).transform(normalizeText);

const phoneSchema = z
  .string()
  .trim()
  .max(20, 'Phone number must be 20 characters or fewer.')
  .regex(/^[+\d][\d\s-]*$/, 'A phone number may contain digits, spaces and hyphens only.')
  .transform(normalizeText);

const emailSchema = z.email('Enter a valid email address.').trim().max(150);

const longTextSchema = z.string().trim().max(1000);

export const updateSettingsBodySchema = z
  .object({
    companyName: shortTextSchema.nullable().optional(),
    address: longTextSchema.nullable().optional(),
    phone: phoneSchema.nullable().optional(),
    email: emailSchema.nullable().optional(),
    paymentDetails: longTextSchema.nullable().optional(),
    footerNotes: longTextSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });
