import type { InvoiceStatus } from '../../generated/prisma/client.js';

export interface CreateInvoiceInput {
  orderId: string;
  dueDate: Date;
}

export interface VoidInvoiceInput {
  reason: string;
}

export interface InvoiceItemSummary {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  status: InvoiceStatus;
  totalAmount: string;
  dueDate: string;
  itemCount: number;
  paymentStatus: InvoicePaymentStatus | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReason: string | null;
  items: InvoiceItemSummary[];
}

export type InvoiceSortField = 'invoiceNumber' | 'createdAt' | 'dueDate';
export type SortDirection = 'asc' | 'desc';

export interface ListInvoicesFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: InvoiceStatus;
  customerId?: string;
  orderId?: string | undefined;
  paymentStatus?: InvoicePaymentStatus | undefined;
  sortBy: InvoiceSortField;
  sortDirection: SortDirection;
}

export interface ListInvoicesResult {
  invoices: InvoiceSummary[];
  totalRecords: number;
}

// --- Phase 9B: Finance summary ---------------------------------------------

export type InvoicePaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'VOIDED';

export interface InvoiceFinanceItem {
  paymentId: string; paymentNumber: string; amount: string; status: string; paymentDate: string;
}

export interface InvoiceFinanceSummary {
  invoiceTotal: string;
  approvedAmount: string;
  outstandingAmount: string;
  pendingAmount: string;
  reversedAmount: string;
  paymentStatus: InvoicePaymentStatus;
  payments: InvoiceFinanceItem[];
}

export interface InvoiceDetailWithFinance extends InvoiceDetail {
  finance: InvoiceFinanceSummary;
}
