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
  orderId?: string;
  sortBy: InvoiceSortField;
  sortDirection: SortDirection;
}

export interface ListInvoicesResult {
  invoices: InvoiceSummary[];
  totalRecords: number;
}
