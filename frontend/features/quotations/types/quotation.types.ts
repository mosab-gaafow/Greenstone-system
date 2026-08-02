/**
 * Quotation types.
 *
 * Mirrors the backend contract. See business-blueprint sections 2.4 and 2.5.
 */

export const QUOTATION_STATUSES = ['DRAFT', 'ACCEPTED', 'REJECTED', 'CANCELLED'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  /** Decimal string, e.g. "150.50". */
  agreedUnitPrice: string;
  lineTotal: string;
}

export interface Quotation {
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

export interface QuotationDetail extends Omit<Quotation, 'itemCount'> {
  items: QuotationItem[];
}

export interface QuotationFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: QuotationStatus;
  customerId?: string;
}

const STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: 'Draft',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function quotationStatusLabel(value: QuotationStatus): string {
  return STATUS_LABELS[value];
}

export const QUOTATION_STATUS_OPTIONS = QUOTATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));
