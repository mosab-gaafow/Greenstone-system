export interface Expense {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  expenseDate: string;
  hasEvidence: boolean;
  recordedByUserId: string | null;
  createdAt: string;
}

export interface EvidenceInfo {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ExpenseDetail extends Expense {
  evidence: EvidenceInfo | null;
}

export type ExpenseCategory = 'ELECTRICITY' | 'WATER' | 'RENT' | 'TRANSPORT' | 'MAINTENANCE' | 'SUPPLIES' | 'COMMUNICATION' | 'INSURANCE' | 'LICENSES' | 'OTHER';
export type PaymentMethod = 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE';

export const expenseCategoryLabel = (c: ExpenseCategory): string => {
  const labels: Record<ExpenseCategory, string> = {
    ELECTRICITY: 'Electricity', WATER: 'Water', RENT: 'Rent', TRANSPORT: 'Transport',
    MAINTENANCE: 'Maintenance', SUPPLIES: 'Supplies', COMMUNICATION: 'Communication',
    INSURANCE: 'Insurance', LICENSES: 'Licenses', OTHER: 'Other',
  };
  return labels[c] ?? c;
};

export const paymentMethodLabel = (m: PaymentMethod): string => {
  const labels: Record<PaymentMethod, string> = {
    CASH: 'Cash', MPESA: 'M-Pesa', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque',
  };
  return labels[m] ?? m;
};
