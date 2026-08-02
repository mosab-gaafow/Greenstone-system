import { z } from 'zod';

/**
 * Company settings form validation.
 *
 * Every field is optional — real company data is unknown during development
 * and is entered later, during production setup.
 */

const phone = z
  .union([
    z.literal(''),
    z
      .string()
      .trim()
      .max(20, 'Phone number must be 20 characters or fewer.')
      .regex(/^[+\d][\d\s-]*$/, 'Use digits, spaces and hyphens only.'),
  ])
  .optional();

export const settingsFormSchema = z.object({
  companyName: z.string().trim().max(150, 'Must be 150 characters or fewer.').optional(),
  address: z.string().trim().max(1000, 'Must be 1000 characters or fewer.').optional(),
  phone,
  email: z.union([z.literal(''), z.email('Enter a valid email address.')]).optional(),
  paymentDetails: z.string().trim().max(1000, 'Must be 1000 characters or fewer.').optional(),
  footerNotes: z.string().trim().max(1000, 'Must be 1000 characters or fewer.').optional(),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
