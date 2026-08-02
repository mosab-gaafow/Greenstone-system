/**
 * Employee types.
 *
 * Mirrors the backend contract. Only the master record and its salary fields
 * live here — salary payment processing is a later phase.
 */

export const SALARY_FREQUENCIES = ['WEEKLY', 'MONTHLY'] as const;
export type SalaryFrequency = (typeof SALARY_FREQUENCIES)[number];

export const PAYMENT_METHODS = ['MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Employee {
  id: string;
  name: string;
  phone: string;
  nationalId: string | null;
  jobTitle: string;
  salaryFrequency: SalaryFrequency;
  /** Decimal string, e.g. "3500.00". */
  salaryAmount: string;
  paymentMethod: PaymentMethod;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFilters {
  page: number;
  pageSize: number;
  search?: string;
  salaryFrequency?: SalaryFrequency;
  isActive?: boolean;
}

const SALARY_FREQUENCY_LABELS: Record<SalaryFrequency, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

export function salaryFrequencyLabel(value: SalaryFrequency): string {
  return SALARY_FREQUENCY_LABELS[value];
}

export const SALARY_FREQUENCY_OPTIONS = SALARY_FREQUENCIES.map((value) => ({
  value,
  label: SALARY_FREQUENCY_LABELS[value],
}));

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MPESA: 'M-Pesa',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
};

export function paymentMethodLabel(value: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[value];
}

export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}));
