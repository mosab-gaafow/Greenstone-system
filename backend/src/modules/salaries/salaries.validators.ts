import { z } from 'zod';
import { isNotFutureNairobiDate } from '../../shared/utils/nairobi.js';

const moneySchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.');
const METHODS = ['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as const;
const TYPES = ['WEEKLY', 'MONTHLY'] as const;
const STATUSES = ['PENDING', 'APPROVED', 'REVERSED'] as const;

export const salaryIdParamsSchema = z.object({ id: z.string().min(1) });

export const createSalaryBodySchema = z.object({
  employeeId: z.string().min(1, 'Select an employee.'),
  salaryType: z.enum(TYPES, { message: 'Select weekly or monthly.' }),
  periodStart: z.coerce.date().refine(isNotFutureNairobiDate, 'Period start cannot be in the future.'),
  periodEnd: z.coerce.date().optional(),
  amount: moneySchema.refine((v) => Number(v) > 0, 'Amount must be greater than zero.'),
  paymentMethod: z.enum(METHODS, { message: 'Select a payment method.' }),
  paymentReference: z.string().trim().max(200).optional(),
  paymentDate: z.coerce.date().refine(isNotFutureNairobiDate, 'Payment date cannot be in the future.'),
  notes: z.string().trim().max(500).optional().nullable(),
}).strict()
  .transform((d) => {
    // Auto-calculate weekly period end = start + 6 days
    if (d.salaryType === 'WEEKLY' && !d.periodEnd) {
      const end = new Date(d.periodStart);
      end.setDate(end.getDate() + 6);
      return { ...d, periodEnd: end };
    }
    return d as { periodEnd: Date } & typeof d;
  })
  .refine((d) => d.periodStart <= d.periodEnd!, { message: 'Period start must not be after period end.', path: ['periodEnd'] })
  .refine((d) => !d.periodEnd || !isNotFutureNairobiDate(d.periodEnd) || true, { message: 'Period end cannot be in the future.' })
  .refine((d) => d.salaryType !== 'WEEKLY' || d.periodEnd, { message: 'Weekly salary period end is required.' })
  .refine((d) => d.paymentMethod === 'CASH' || (d.paymentReference && d.paymentReference.trim().length > 0), { message: 'Payment reference is required for non-cash payments.', path: ['paymentReference'] });

// Validate periodEnd manually for non-weekly (weekly is auto-calculated)
export function validateSalaryDates(data: { periodStart: Date; periodEnd: Date; salaryType: string }): string | null {
  if (data.periodEnd && isNotFutureNairobiDate(data.periodEnd)) return 'Period end cannot be in the future.';
  if (data.periodStart > data.periodEnd) return 'Period start must not be after period end.';
  return null;
}

export const updateSalaryBodySchema = z.object({
  employeeId: z.string().min(1, 'Select an employee.').optional(),
  salaryType: z.enum(TYPES, { message: 'Select weekly or monthly.' }).optional(),
  periodStart: z.coerce.date().refine(isNotFutureNairobiDate, 'Period start cannot be in the future.').optional(),
  periodEnd: z.coerce.date().optional(),
  amount: moneySchema.refine((v) => Number(v) > 0, 'Amount must be greater than zero.').optional(),
  paymentMethod: z.enum(METHODS, { message: 'Select a payment method.' }).optional(),
  paymentReference: z.string().trim().max(200).optional().nullable(),
  paymentDate: z.coerce.date().refine(isNotFutureNairobiDate, 'Payment date cannot be in the future.').optional(),
  notes: z.string().trim().max(500).optional().nullable(),
}).strict().refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update.' })
  .refine((d) => !d.paymentMethod || d.paymentMethod === 'CASH' || (d.paymentReference && d.paymentReference.trim().length > 0), { message: 'Payment reference is required for non-cash payments.', path: ['paymentReference'] });

export const approveSalaryBodySchema = z.object({}).strict();

export const correctSalaryBodySchema = z.object({
  amount: moneySchema.refine((v) => Number(v) > 0, 'Amount must be greater than zero.'),
  paymentMethod: z.enum(METHODS, { message: 'Select a payment method.' }),
  paymentReference: z.string().trim().max(200).optional(),
  paymentDate: z.coerce.date().refine(isNotFutureNairobiDate, 'Payment date cannot be in the future.'),
  notes: z.string().trim().max(500).optional().nullable(),
  reason: z.string().trim().min(1, 'A correction reason is required.').max(500),
}).strict().refine((d) => d.paymentMethod === 'CASH' || (d.paymentReference && d.paymentReference.trim().length > 0), { message: 'Payment reference is required for non-cash payments.', path: ['paymentReference'] });

export const reverseSalaryBodySchema = z.object({
  reason: z.string().trim().min(1, 'A reversal reason is required.').max(500),
}).strict();

export const listSalariesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  status: z.enum(STATUSES).optional(),
  salaryType: z.enum(TYPES).optional(),
  paymentMethod: z.enum(METHODS).optional(),
  employeeId: z.string().min(1).optional(),
  sortBy: z.enum(['salaryNumber', 'createdAt', 'paymentDate', 'amount']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
