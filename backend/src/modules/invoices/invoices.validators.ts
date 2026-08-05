import { z } from 'zod';

export const invoiceIdParamsSchema = z.object({
  id: z.string().min(1, 'An invoice id is required.'),
});

export const createInvoiceBodySchema = z
  .object({
    orderId: z.string().min(1, 'Select an order.'),
    dueDate: z.coerce.date(),
  })
  .strict();

export const voidInvoiceBodySchema = z
  .object({
    reason: z.string().trim().min(1, 'A reason is required.').max(500),
  })
  .strict();

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  status: z.enum(['ISSUED', 'VOIDED']).optional(),
  customerId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  sortBy: z.enum(['invoiceNumber', 'createdAt', 'dueDate']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
