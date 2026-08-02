import { z } from 'zod';
import { PAYMENT_METHODS, SALARY_FREQUENCIES } from '../types/employee.types';

/**
 * Employee form validation.
 *
 * Mirrors the backend rules so problems are caught before a request is sent.
 * The backend validates everything again and remains the only authority.
 */

const phone = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number.')
  .max(20, 'Phone number must be 20 characters or fewer.')
  .regex(/^[+\d][\d\s-]*$/, 'Use digits, spaces and hyphens only.')
  .refine((value) => value.replace(/\D/g, '').length >= 9, {
    message: 'Enter a complete phone number.',
  });

export const employeeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Employee name must be at least 2 characters.')
    .max(150, 'Employee name must be 150 characters or fewer.')
    .transform((value) => value.replace(/\s+/g, ' ')),
  phone,
  nationalId: z.string().trim().max(20, 'National ID must be 20 characters or fewer.').optional(),
  jobTitle: z
    .string()
    .trim()
    .min(2, 'Job title must be at least 2 characters.')
    .max(100, 'Job title must be 100 characters or fewer.'),
  salaryFrequency: z.enum(SALARY_FREQUENCIES, { message: 'Choose a salary frequency.' }),
  salaryAmount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.')
    .refine((value) => Number(value) > 0, { message: 'Salary amount must be greater than zero.' }),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Choose a payment method.' }),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
