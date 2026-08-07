import { z } from 'zod';

const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine((d) => d.from <= d.to, { message: 'From date must not be after to date.', path: ['from'] });

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

// ── Phase 11C2: Operations ────────────────────────────────────────

export const productionReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
});

export const curingReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  productId: z.string().optional(),
});

export const deliveriesReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
});

// ── Phase 11C2: Stock ─────────────────────────────────────────────

const stockSnapshotSchema = z.object({
  search: z.string().optional(),
});

export const finishedStockSchema = stockSnapshotSchema;
export const reservedStockSchema = stockSnapshotSchema;
export const availableStockSchema = stockSnapshotSchema;
export const lowStockSchema = stockSnapshotSchema;

export const stockMovementReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  movementType: z.string().optional(),
});

// ── Phase 11C3: Purchasing ────────────────────────────────────────

export const purchasesReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  supplierId: z.string().optional(),
});

export const purchasePaymentsReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export const suppliersReportSchema = z.object({
  search: z.string().optional(),
  balanceFilter: z.enum(['all', 'has-outstanding', 'zero-balance']).optional(),
});

// ── Phase 11C4: Finance ───────────────────────────────────────────

export const expensesReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
});

export const salariesReportSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  salaryType: z.string().optional(),
  status: z.string().optional(),
});

export const outstandingInvoicesSchema = dateRangeSchema.extend({
  search: z.string().optional(),
  paymentStatus: z.string().optional(),
});

export const billingSummarySchema = dateRangeSchema.extend({
  groupBy: z.enum(['day', 'month']).optional(),
});
