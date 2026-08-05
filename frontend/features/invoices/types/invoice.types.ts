export const INVOICE_STATUSES = ['ISSUED', 'VOIDED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceItem {
  id: string; orderItemId: string; productId: string; productName: string;
  quantity: number; unitPrice: string; lineTotal: string;
}

export interface Invoice {
  id: string; invoiceNumber: string; orderId: string; orderNumber: string;
  customerId: string; customerName: string; status: InvoiceStatus;
  totalAmount: string; dueDate: string; itemCount: number;
  voidedAt: string | null; voidReason: string | null;
  createdAt: string; updatedAt: string;
}

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID';

export interface InvoiceFinanceItem {
  paymentId: string; paymentNumber: string; amount: string; status: string; paymentDate: string;
}

export interface InvoiceFinanceSummary {
  invoiceTotal: string; approvedAmount: string; outstandingAmount: string;
  pendingAmount: string; reversedAmount: string; paymentStatus: PaymentStatus;
  payments: InvoiceFinanceItem[];
}

export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
  finance?: InvoiceFinanceSummary;
}

const STATUS_LABELS: Record<InvoiceStatus, string> = { ISSUED: 'Issued', VOIDED: 'Voided' };
export function invoiceStatusLabel(s: InvoiceStatus) { return STATUS_LABELS[s]; }

const PSTATUS_LABELS: Record<PaymentStatus, string> = { UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially paid', FULLY_PAID: 'Fully paid' };
export function paymentStatusLabel(s: PaymentStatus) { return PSTATUS_LABELS[s]; }
