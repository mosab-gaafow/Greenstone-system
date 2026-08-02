import type { RawMaterialMovementType } from '../../generated/prisma/client.js';

/**
 * Raw material module types.
 *
 * See business-blueprint sections 2.12–2.15 and
 * docs/implementation-plan.md Phase 6A.
 */

export interface RawMaterialSummary {
  id: string;
  name: string;
  measurementUnitId: string;
  measurementUnitName: string;
  measurementUnitSymbol: string | null;
  /** Decimal string, or null when no reorder level has been set. */
  reorderLevel: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRawMaterialInput {
  name: string;
  measurementUnitId: string;
  reorderLevel?: string | null | undefined;
}

export interface UpdateRawMaterialInput {
  name?: string | undefined;
  measurementUnitId?: string | undefined;
  reorderLevel?: string | null | undefined;
}

export type RawMaterialSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListRawMaterialsFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  sortBy: RawMaterialSortField;
  sortDirection: SortDirection;
}

export interface ListRawMaterialsResult {
  rawMaterials: RawMaterialSummary[];
  totalRecords: number;
}

export interface RawMaterialStockDetail {
  rawMaterialId: string;
  /** Decimal string. */
  quantity: string;
  version: number;
  updatedAt: string;
}

export interface RawMaterialMovementSummary {
  id: string;
  movementType: RawMaterialMovementType;
  /** Decimal string. Signed: positive increases stock, negative decreases it. */
  quantity: string;
  /** Decimal string. */
  balanceAfter: string;
  relatedEntityId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface ListRawMaterialMovementsFilters {
  page: number;
  pageSize: number;
}

export interface ListRawMaterialMovementsResult {
  movements: RawMaterialMovementSummary[];
  totalRecords: number;
}

/** Sets the balance to an absolute quantity — see business-blueprint 2.15. */
export interface SetOpeningRawMaterialStockInput {
  /** Decimal string. Must not be negative. */
  quantity: string;
  reason?: string | null | undefined;
}

/** Applies a signed delta to the current balance. */
export interface AdjustRawMaterialStockInput {
  /** Signed decimal string. Positive increases stock, negative decreases it. */
  quantity: string;
  reason: string;
}
