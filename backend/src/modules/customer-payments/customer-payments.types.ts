import type { PaymentMethod, PurchasePaymentStatus } from '../../generated/prisma/client.js';

export interface CreatePaymentInput {
  customerId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentDate: Date;
}

export interface PaymentAllocationInput {
  invoiceId: string;
  amount: string;
}

export interface ApprovePaymentInput {
  allocations: PaymentAllocationInput[];
}

export interface ReversePaymentInput {
  reason: string;
}

export interface AllocationSummary { id: string; invoiceId: string; invoiceNumber: string; amount: string; }
export interface PaymentSummary { id: string; paymentNumber: string; customerId: string; customerName: string; amount: string; paymentMethod: PaymentMethod; status: PurchasePaymentStatus; paymentDate: string; createdAt: string; }
export interface PaymentDetail extends PaymentSummary { paymentReference: string | null; approvedByUserId: string | null; approvedAt: string | null; reversedByUserId: string | null; reversedAt: string | null; reversalReason: string | null; recordedByUserId: string | null; allocations: AllocationSummary[]; receiptId: string | null; receiptNumber: string | null; }
export interface ApprovePaymentResult { id: string; paymentNumber: string; status: 'APPROVED'; receiptId: string; receiptNumber: string; }
export interface ReversePaymentResult { id: string; paymentNumber: string; status: 'REVERSED'; }

export type PaymentSortField = 'paymentNumber' | 'createdAt' | 'paymentDate';
export type SortDirection = 'asc' | 'desc';
export interface ListPaymentsFilters { page: number; pageSize: number; search?: string; status?: PurchasePaymentStatus; customerId?: string; sortBy: PaymentSortField; sortDirection: SortDirection; }
export interface ListPaymentsResult { payments: PaymentSummary[]; totalRecords: number; }
