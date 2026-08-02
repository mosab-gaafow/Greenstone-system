import type { QuotationStatus } from '../../generated/prisma/client.js';

/**
 * Quotation module types.
 *
 * See business-blueprint sections 2.4 and 2.5, and
 * docs/implementation-plan.md Phase 5A.
 */

export interface QuotationItemInput {
  productId: string;
  quantity: number;
  /** Decimal string, never a JavaScript number. */
  agreedUnitPrice: string;
}

export interface QuotationItemSummary {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  agreedUnitPrice: string;
  lineTotal: string;
}

export interface QuotationSummary {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  status: QuotationStatus;
  totalAmount: string;
  statusReason: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationDetail extends Omit<QuotationSummary, 'itemCount'> {
  items: QuotationItemSummary[];
}

export interface CreateQuotationInput {
  customerId: string;
  items: QuotationItemInput[];
}

export interface UpdateQuotationInput {
  customerId?: string | undefined;
  items?: QuotationItemInput[] | undefined;
}

export interface QuotationStatusChangeInput {
  reason?: string | undefined;
}

export type QuotationSortField = 'quotationNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListQuotationsFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  status?: QuotationStatus | undefined;
  customerId?: string | undefined;
  sortBy: QuotationSortField;
  sortDirection: SortDirection;
}

export interface ListQuotationsResult {
  quotations: QuotationSummary[];
  totalRecords: number;
}
