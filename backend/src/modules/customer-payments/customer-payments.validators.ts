import { z } from 'zod';

const moneySchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.');
const CUSTOMER_METHODS = ['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as const;

export const paymentIdParamsSchema = z.object({ id: z.string().min(1) });

const allocItemSchema = z.object({ invoiceId: z.string().min(1), amount: moneySchema });

export const createPaymentBodySchema = z.object({
  customerId: z.string().min(1, 'Select a customer.'),
  amount: moneySchema.refine((v) => Number(v) > 0, 'Amount must be greater than zero.'),
  paymentMethod: z.enum(CUSTOMER_METHODS, { message: 'Select a payment method.' }),
  paymentReference: z.string().trim().max(200).optional(),
  paymentDate: z.coerce.date(),
  allocations: z.array(allocItemSchema).min(1, 'Add at least one allocation.'),
}).strict().refine((d) => d.paymentMethod === 'CASH' || (d.paymentReference && d.paymentReference.trim().length > 0), { message: 'Payment reference is required for non-cash payments.', path: ['paymentReference'] });

export const approvePaymentBodySchema = z.object({
  allocations: z.array(z.object({ invoiceId: z.string().min(1), amount: moneySchema })).optional(),
}).strict();

export const reversePaymentBodySchema = z.object({ reason: z.string().trim().min(1, 'A reason is required.').max(500) }).strict();

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(), status: z.enum(['PENDING', 'APPROVED', 'REVERSED']).optional(),
  customerId: z.string().min(1).optional(),
  paymentMethod: z.enum(CUSTOMER_METHODS).optional(),
  sortBy: z.enum(['paymentNumber', 'createdAt', 'paymentDate']).default('createdAt'), sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

export const evidenceQuerySchema = z.object({
  disposition: z.enum(['inline', 'attachment']).optional().default('attachment'),
});
