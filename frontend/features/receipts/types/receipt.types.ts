export interface Receipt {
  id: string;
  receiptNumber: string;
  status: 'ACTIVE' | 'VOIDED';
  amount: string;
  issuedAt: string;
  customerName: string;
  paymentNumber: string;
  paymentMethod: string;
  paymentReference: string | null;
  invoiceNumber: string | null;
}

export interface ReceiptDetail {
  id: string;
  receiptNumber: string;
  status: 'ACTIVE' | 'VOIDED';
  amount: string;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
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
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  allocations: {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    orderNumber: string;
    amount: string;
  }[];
}

export const receiptStatusLabel = (status: string): string => {
  if (status === 'VOIDED') return 'Voided';
  return 'Active';
};

export const paymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    MPESA: 'M-Pesa',
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
  };
  return labels[method] ?? method;
};
