import type { CuringDuration } from '@/features/production/types/production.types';

/**
 * Curing types.
 *
 * See business-blueprint section 2.8.
 */

/** Server-derived — see backend curing.types.ts. */
export type CuringStatus = 'IN_PROGRESS' | 'READY_FOR_RELEASE' | 'RELEASED';

export interface CuringRecord {
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
  /** Server-derived curing status. */
  status: CuringStatus;
}

export type CuringStatusFilter = 'PENDING' | 'RELEASED';

export interface CuringFilters {
  page: number;
  pageSize: number;
  status?: CuringStatusFilter;
  productId?: string;
}

export function isCuringReleased(record: CuringRecord): boolean {
  return record.status === 'RELEASED';
}

export function isCuringReleasable(record: CuringRecord): boolean {
  return record.status === 'READY_FOR_RELEASE';
}
