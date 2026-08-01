/**
 * Customer module types.
 *
 * Addresses live inside the customers domain, per technical-blueprint section
 * 3.3, so they have no module of their own.
 */

export interface CustomerAddressSummary {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  directions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  /** Active addresses only. Useful for a list without loading them all. */
  addressCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  addresses: CustomerAddressSummary[];
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string | null | undefined;
}

export interface UpdateCustomerInput {
  name?: string | undefined;
  phone?: string | undefined;
  email?: string | null | undefined;
}

export interface CreateAddressInput {
  label: string;
  addressLine: string;
  directions?: string | null | undefined;
}

export interface UpdateAddressInput {
  label?: string | undefined;
  addressLine?: string | undefined;
  directions?: string | null | undefined;
}

export type CustomerSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListCustomersFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  sortBy: CustomerSortField;
  sortDirection: SortDirection;
}

export interface ListCustomersResult {
  customers: CustomerSummary[];
  totalRecords: number;
}
