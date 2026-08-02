/**
 * Supplier types.
 *
 * Master record only — purchases, purchase payments, and opening/outstanding
 * balances (business-blueprint sections 2.17-2.18) are Phase 7.
 */

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
