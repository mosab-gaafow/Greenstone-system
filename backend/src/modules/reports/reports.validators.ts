import { z } from 'zod';

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const ordersReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  customerId: z.string().optional(),
  orderStatus: z.string().optional(),
});

export const topOrdersSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const topCustomersSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const customerBalancesSchema = z.object({
  search: z.string().optional(),
  balanceFilter: z.enum(['all', 'has-outstanding', 'zero-balance']).optional(),
});

export const invoicesReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  customerId: z.string().optional(),
  invoiceStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
});

export const paymentsReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  customerId: z.string().optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export const receiptsReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  customerId: z.string().optional(),
  receiptStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
});
