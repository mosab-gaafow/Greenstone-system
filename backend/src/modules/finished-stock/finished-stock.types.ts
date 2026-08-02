import type { FinishedStockMovementType } from '../../generated/prisma/client.js';

/**
 * Finished stock module types.
 *
 * See business-blueprint section 2.9 and docs/implementation-plan.md
 * Phase 6A. Quantities are whole numbers — product pieces are never
 * fractional.
 */

export interface FinishedStockBalanceDetail {
  productId: string;
  physicalQuantity: number;
  /** Written starting in Phase 8 (Stock Reservation, tied to Delivery). Always 0 today. */
  reservedQuantity: number;
  availableQuantity: number;
  version: number;
  updatedAt: string;
}

export interface FinishedStockMovementSummary {
  id: string;
  movementType: FinishedStockMovementType;
  /** Signed: positive increases stock, negative decreases it. */
  quantity: number;
  balanceAfter: number;
  relatedEntityId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface ListFinishedStockMovementsFilters {
  page: number;
  pageSize: number;
}

export interface ListFinishedStockMovementsResult {
  movements: FinishedStockMovementSummary[];
  totalRecords: number;
}

/** Sets physical stock to an absolute quantity — see business-blueprint 2.10. */
export interface SetOpeningFinishedStockInput {
  quantity: number;
  reason?: string | null | undefined;
}

/** Applies a signed delta to the current physical quantity. */
export interface AdjustFinishedStockInput {
  quantity: number;
  reason: string;
}
