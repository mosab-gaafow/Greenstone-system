import type { PaymentMethod, PurchasePaymentStatus } from '../../generated/prisma/client.js';

/**
 * Purchase payment module types.
 *
 * See business-blueprint sections 2.16-2.17, technical-blueprint section
 * 4.10, and docs/implementation-plan.md Phase 7D.
 */

export interface PurchasePaymentAllocationInput {
  purchaseId: string;
  /** Decimal string. Must be greater than zero. */
  allocatedAmount: string;
}

export interface CreatePurchasePaymentInput {
  supplierId: string;
  /** Decimal string. Must be greater than zero and not exceed the supplier's outstanding balance. */
  amount: string;
  paymentMethod: PaymentMethod;
  /**
   * Required regardless of `paymentMethod` — the transaction code, bank
   * reference, cheque number/details, or cash voucher/receipt information.
   * The frontend changes only the field's label per method.
   */
  paymentReference: string;
  paymentDate: Date;
  /** Traceability only — never gates the supplier balance. May be empty. */
  allocations: PurchasePaymentAllocationInput[];
}

export interface ReversePurchasePaymentInput {
  reason: string;
}

export interface PurchasePaymentAllocationSummary {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  /** Decimal string. */
  allocatedAmount: string;
}

export interface PurchasePaymentSummary {
  id: string;
  paymentNumber: string;
  supplierId: string;
  supplierName: string;
  /** Decimal string. */
  amount: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentDate: string;
  status: PurchasePaymentStatus;
  hasEvidence: boolean;
  /** Decimal string. Sum of this payment's own allocations (traceability only). */
  allocatedTotal: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePaymentDetail extends PurchasePaymentSummary {
  allocations: PurchasePaymentAllocationSummary[];
  approvedByUserId: string | null;
  approvedAt: string | null;
  reversedByUserId: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
}

export type PurchasePaymentSortField = 'paymentNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListPurchasePaymentsFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  supplierId?: string | undefined;
  /** Payments with at least one allocation to this purchase — purchase-level payment history. */
  purchaseId?: string | undefined;
  status?: PurchasePaymentStatus | undefined;
  sortBy: PurchasePaymentSortField;
  sortDirection: SortDirection;
}

export interface ListPurchasePaymentsResult {
  payments: PurchasePaymentSummary[];
  totalRecords: number;
}

/** A validated evidence file, already read into memory by the upload middleware. */
export interface EvidenceFileInput {
  content: Buffer;
  mimeType: string;
  originalFileName: string;
}
