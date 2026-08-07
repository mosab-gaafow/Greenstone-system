import { z } from 'zod';

export const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv', 'pdf']),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  orderStatus: z.string().optional(),
  invoiceStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptStatus: z.string().optional(),
  category: z.string().optional(),
  salaryType: z.string().optional(),
  movementType: z.string().optional(),
  supplierId: z.string().optional(),
  balanceFilter: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  groupBy: z.string().optional(),
});
