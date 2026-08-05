import type { PaymentMethod } from '@/features/purchase-payments/types/purchase-payment.types';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REVERSED';
export const PAYMENT_METHODS = ['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as const;

export interface Allocation { id: string; invoiceId: string; invoiceNumber: string; amount: string; }
export interface Payment { id: string; paymentNumber: string; customerId: string; customerName: string; amount: string; paymentMethod: PaymentMethod; status: PaymentStatus; paymentDate: string; createdAt: string; }
export interface PaymentDetail extends Payment { paymentReference: string | null; approvedAt: string | null; reversedAt: string | null; reversalReason: string | null; allocations: Allocation[]; receiptId: string | null; receiptNumber: string | null; }

const STATUS_LABELS: Record<PaymentStatus, string> = { PENDING: 'Pending', APPROVED: 'Approved', REVERSED: 'Reversed' };
export function paymentStatusLabel(s: PaymentStatus) { return STATUS_LABELS[s]; }

const METHOD_LABELS: Record<string, string> = { CASH: 'Cash', MPESA: 'M-Pesa', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' };
export function paymentMethodLabel(m: PaymentMethod) { return METHOD_LABELS[m] ?? m; }
