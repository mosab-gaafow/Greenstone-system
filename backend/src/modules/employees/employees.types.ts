import type { PaymentMethod, SalaryFrequency } from '../../generated/prisma/client.js';

/**
 * Employee module types.
 *
 * Only the master record and its salary fields live here. Salary payment
 * processing (registration, approval, correction, reversal) is a later phase.
 * See business-blueprint section 2.28.
 */

export interface EmployeeSummary {
  id: string;
  name: string;
  phone: string;
  nationalId: string | null;
  jobTitle: string;
  salaryFrequency: SalaryFrequency;
  /** Decimal string, never a float. */
  salaryAmount: string;
  paymentMethod: PaymentMethod;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  name: string;
  phone: string;
  nationalId?: string | null | undefined;
  jobTitle: string;
  salaryFrequency: SalaryFrequency;
  salaryAmount: string;
  paymentMethod: PaymentMethod;
}

export interface UpdateEmployeeInput {
  name?: string | undefined;
  phone?: string | undefined;
  nationalId?: string | null | undefined;
  jobTitle?: string | undefined;
  salaryFrequency?: SalaryFrequency | undefined;
  salaryAmount?: string | undefined;
  paymentMethod?: PaymentMethod | undefined;
}

export type EmployeeSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListEmployeesFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  salaryFrequency?: SalaryFrequency | undefined;
  isActive?: boolean | undefined;
  sortBy: EmployeeSortField;
  sortDirection: SortDirection;
}

export interface ListEmployeesResult {
  employees: EmployeeSummary[];
  totalRecords: number;
}
