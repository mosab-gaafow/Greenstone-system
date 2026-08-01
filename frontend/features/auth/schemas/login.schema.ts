import { z } from 'zod';

/**
 * Login form validation.
 *
 * This improves the experience only. The backend validates every field again
 * and is the only authority.
 */
export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').trim(),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginValues = z.infer<typeof loginSchema>;
