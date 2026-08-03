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
  /** Written reason for the most recent deactivation. Cleared on reactivation. */
  deactivationReason: string | null;
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

/**
 * Force-deactivation (Phase 6E addendum) — Super Admin/Admin only, bypasses
 * the normal deactivation safeguards for an exceptional business reason.
 * Never optional, unlike normal deactivation which needs no input at all.
 */
export interface ForceDeactivateCustomerInput {
  reason: string;
}

/**
 * An order that is not yet `COMPLETED` or `CANCELLED` — read directly from
 * the `orders` table by this module's own repository (a plain query, not a
 * cross-module service call), the same one-directional-dependency pattern
 * `customer-credit.repository.ts` already uses for its own order aggregate.
 * This keeps `customers` free of a dependency on the `orders` module.
 */
export interface ActiveOrderSummary {
  orderNumber: string;
  status: string;
}

export type CustomerSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListCustomersFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  /**
   * Undefined means both. `true` filters to customers with an accounting
   * outstanding balance greater than zero; `false` to those with none
   * (including a customer with no `CustomerOpeningBalance` row at all).
   * Independent of `isActive` and of credit status (Phase 6E) — see
   * business-blueprint section 2.2.
   */
  hasOutstandingBalance?: boolean | undefined;
  sortBy: CustomerSortField;
  sortDirection: SortDirection;
}

export interface ListCustomersResult {
  customers: CustomerSummary[];
  totalRecords: number;
}
