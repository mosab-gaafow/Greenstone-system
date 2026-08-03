/**
 * Purchase payment types.
 *
 * See business-blueprint sections 2.16-2.17 and docs/implementation-plan.md
 * Phase 7D.
 */

export const PAYMENT_METHODS = ['MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PURCHASE_PAYMENT_STATUSES = ['PENDING', 'APPROVED', 'REVERSED'] as const;
export type PurchasePaymentStatus = (typeof PURCHASE_PAYMENT_STATUSES)[number];

export interface PurchasePaymentAllocation {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  /** Decimal string. */
  allocatedAmount: string;
}

export interface PurchasePayment {
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
  /** Decimal string. Traceability only. */
  allocatedTotal: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchasePaymentDetail extends PurchasePayment {
  allocations: PurchasePaymentAllocation[];
  approvedByUserId: string | null;
  approvedAt: string | null;
  reversedByUserId: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
}

export interface PurchasePaymentFilters {
  page: number;
  pageSize: number;
  search?: string;
  supplierId?: string;
  purchaseId?: string;
  status?: PurchasePaymentStatus;
}

const STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REVERSED: 'Reversed',
};

export function purchasePaymentStatusLabel(value: PurchasePaymentStatus): string {
  return STATUS_LABELS[value];
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MPESA: 'M-Pesa',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
};

export function paymentMethodLabel(value: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[value];
}

/**
 * The reference field is always required, regardless of method — only its
 * label changes, per the confirmed Phase 7D rule. Mirrors
 * `purchase_payments.paymentReference`'s doc comment in the backend schema.
 */
const PAYMENT_REFERENCE_LABELS: Record<PaymentMethod, string> = {
  MPESA: 'M-Pesa transaction code',
  CASH: 'Cash voucher or receipt reference',
  BANK_TRANSFER: 'Bank transfer reference',
  CHEQUE: 'Cheque number or details',
};

export function paymentReferenceLabel(value: PaymentMethod): string {
  return PAYMENT_REFERENCE_LABELS[value];
}

export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((value) => ({
  value,
  label: paymentMethodLabel(value),
}));
