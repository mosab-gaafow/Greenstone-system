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

export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
}

const STATUS_LABELS: Record<InvoiceStatus, string> = { ISSUED: 'Issued', VOIDED: 'Voided' };
export function invoiceStatusLabel(s: InvoiceStatus) { return STATUS_LABELS[s]; }
