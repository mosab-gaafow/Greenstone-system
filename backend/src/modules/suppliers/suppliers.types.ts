/**
 * Supplier module types.
 *
 * Master record only. Purchases, purchase payments, and opening/outstanding
 * balances (business-blueprint sections 2.17–2.18) are Phase 7.
 */

export interface SupplierSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  name: string;
  phone: string;
  email?: string | null | undefined;
  address?: string | null | undefined;
}

export interface UpdateSupplierInput {
  name?: string | undefined;
  phone?: string | undefined;
  email?: string | null | undefined;
  address?: string | null | undefined;
}

export type SupplierSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListSuppliersFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  sortBy: SupplierSortField;
  sortDirection: SortDirection;
}

export interface ListSuppliersResult {
  suppliers: SupplierSummary[];
  totalRecords: number;
}
