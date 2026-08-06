import type { ReceiptStatus } from '../../generated/prisma/client.js';

export interface ReceiptSummary {
  id: string;
  receiptNumber: string;
  status: ReceiptStatus;
  amount: string;
  issuedAt: string;
  customerName: string;
  paymentNumber: string;
  paymentMethod: string;
  paymentReference: string | null;
  invoiceNumber: string | null;
}

export interface ListReceiptsFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: ReceiptStatus;
  paymentMethod?: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface ListReceiptsResult {
  receipts: ReceiptSummary[];
  totalRecords: number;
}

export interface ReceiptDetail {
  id: string;
  receiptNumber: string;
  status: ReceiptStatus;
  amount: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;

  /** Payment linked to this receipt. */
  payment: {
    id: string;
    paymentNumber: string;
    status: string;
    amount: string;
    paymentMethod: string;
    paymentReference: string | null;
    paymentDate: string;
    approvedAt: string | null;
    approvedByUser: { name: string } | null;
    reversedAt: string | null;
    reversalReason: string | null;
  };

  /** Customer who made the payment. */
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };

  /** Invoice allocations for this payment. */
  allocations: {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    orderNumber: string;
    amount: string;
  }[];
}
