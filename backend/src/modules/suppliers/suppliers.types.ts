/**
 * Supplier module types.
 *
 * Master record, opening balance, and balance display (business-blueprint
 * sections 2.17–2.18, Phase 7A). Purchases and purchase payments are Phase
 * 7C/7D — until then, `outstandingBalance` equals `openingBalance` alone.
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

export interface SetSupplierOpeningBalanceInput {
  /** Decimal string, never a JavaScript number. Must be zero or greater. */
  amount: string;
  effectiveDate: Date;
  reason: string;
}

export interface SupplierOpeningBalanceDetail {
  supplierId: string;
  amount: string;
  effectiveDate: string;
  reason: string;
  enteredByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The supplier's outstanding balance. See business-blueprint section 2.17.
 *
 * `outstandingBalance` equals `openingBalance` alone until Phase 7C/7D add
 * Purchases and Purchase Payments — at that point it becomes
 * `openingBalance + unpaidApprovedPurchases − approvedPurchasePaymentAllocations`.
 * Never cached — see docs/technical-blueprint.md section 4A.3 ("supplier
 * balances" is one of the values that must always be read live).
 */
export interface SupplierBalanceResult {
  supplierId: string;
  /** Decimal string. `0.00` when no opening balance has been entered. */
  openingBalance: string;
  /** Decimal string. `openingBalance` alone today — see the note above. */
  outstandingBalance: string;
}
