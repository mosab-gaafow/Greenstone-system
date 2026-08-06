import { z } from 'zod';
import { isNotFutureNairobiDate } from '../../shared/utils/nairobi.js';

const CATEGORIES = ['ELECTRICITY', 'WATER', 'RENT', 'TRANSPORT', 'MAINTENANCE', 'SUPPLIES', 'COMMUNICATION', 'INSURANCE', 'LICENSES', 'OTHER'] as const;
const METHODS = ['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as const;
const moneySchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.');

export const expenseIdParamsSchema = z.object({ id: z.string().min(1) });

export const createExpenseBodySchema = z.object({
  category: z.enum(CATEGORIES, { message: 'Select a category.' }),
  description: z.string().trim().min(1, 'A description is required.').max(500),
  amount: moneySchema.refine((v) => Number(v) > 0, 'Amount must be greater than zero.'),
  paymentMethod: z.enum(METHODS, { message: 'Select a payment method.' }),
  paymentReference: z.string().trim().max(200).optional(),
  expenseDate: z.coerce.date().refine(isNotFutureNairobiDate, 'Expense date cannot be in the future.'),
}).strict().refine((d) => d.paymentMethod === 'CASH' || (d.paymentReference && d.paymentReference.trim().length > 0), { message: 'Payment reference is required for non-cash payments.', path: ['paymentReference'] });

export const updateExpenseBodySchema = z.object({
  category: z.enum(CATEGORIES, { message: 'Select a category.' }).optional(),
  description: z.string().trim().min(1, 'A description is required.').max(500).optional(),
  amount: moneySchema.refine((v) => Number(v) > 0, 'Amount must be greater than zero.').optional(),
  paymentMethod: z.enum(METHODS, { message: 'Select a payment method.' }).optional(),
  paymentReference: z.string().trim().max(200).optional().nullable(),
  expenseDate: z.coerce.date().refine(isNotFutureNairobiDate, 'Expense date cannot be in the future.').optional(),
}).strict().refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update.' });

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  category: z.enum(CATEGORIES).optional(),
  paymentMethod: z.enum(METHODS).optional(),
  sortBy: z.enum(['expenseNumber', 'expenseDate', 'category', 'amount', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
