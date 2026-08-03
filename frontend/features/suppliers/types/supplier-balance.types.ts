/**
 * Supplier balance types (Phase 7A). Mirrors the backend contract — see
 * business-blueprint section 2.18 and
 * frontend/features/customers/types/customer-credit.types.ts for the
 * equivalent customer-side shape this was modelled on.
 */

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
 * `outstandingBalance` equals `openingBalance` alone until Purchases and
 * Purchase Payments exist (Phase 7C/7D) — see the backend type's doc comment
 * for the full formula that applies once they do.
 */
export interface SupplierBalanceResult {
  supplierId: string;
  openingBalance: string;
  outstandingBalance: string;
}
