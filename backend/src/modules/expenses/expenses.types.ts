import type { ExpenseCategory, PaymentMethod } from '../../generated/prisma/client.js';

export interface ExpenseSummary {
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

export interface ExpenseDetail extends ExpenseSummary {
  evidence: EvidenceInfo | null;
}

export interface UpdateExpenseInput {
  category?: ExpenseCategory;
  description?: string;
  amount?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string | null;
  expenseDate?: Date;
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string | null;
  expenseDate: Date;
}

export interface EvidenceFileInput {
  content: Buffer;
  mimeType: string;
  originalFileName: string;
}

export type ExpenseSortField = 'expenseNumber' | 'expenseDate' | 'category' | 'amount' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListExpensesFilters {
  page: number;
  pageSize: number;
  search?: string;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  sortBy: ExpenseSortField;
  sortDirection: SortDirection;
}

export interface ListExpensesResult {
  expenses: ExpenseSummary[];
  totalRecords: number;
}
