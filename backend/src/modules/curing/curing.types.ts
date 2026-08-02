import type { CuringDuration } from '../../generated/prisma/client.js';

/**
 * Curing module types.
 *
 * See business-blueprint section 2.8 and docs/implementation-plan.md
 * Phase 6B.
 */

export interface CuringRecordSummary {
  id: string;
  productionItemId: string;
  productionBatchId: string;
  productId: string;
  productName: string;
  productionNumber: string;
  quantityEntering: number;
  originalDuration: CuringDuration;
  currentDuration: CuringDuration;
  startedAt: string;
  plannedCompletion: string;
  actualRelease: string | null;
  brokenQuantity: number;
  releasedQuantity: number | null;
  durationChangeReason: string | null;
  changedByUserId: string | null;
  changedAt: string | null;
  releasedByUserId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface ChangeCuringDurationInput {
  reason: string;
}

export interface ReleaseCuringInput {
  /** Defaults to 0 — breakage discovered during curing. */
  brokenQuantity?: number | undefined;
}

export type CuringStatusFilter = 'PENDING' | 'RELEASED';
export type CuringSortField = 'startedAt' | 'plannedCompletion' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListCuringFilters {
  page: number;
  pageSize: number;
  status?: CuringStatusFilter | undefined;
  productId?: string | undefined;
  sortBy: CuringSortField;
  sortDirection: SortDirection;
}

export interface ListCuringResult {
  records: CuringRecordSummary[];
  totalRecords: number;
}
