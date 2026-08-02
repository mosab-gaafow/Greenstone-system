import type { CuringDuration } from '@/features/production/types/production.types';

/**
 * Curing types.
 *
 * See business-blueprint section 2.8.
 */

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
}

export type CuringStatusFilter = 'PENDING' | 'RELEASED';

export interface CuringFilters {
  page: number;
  pageSize: number;
  status?: CuringStatusFilter;
  productId?: string;
}

export function isCuringReleased(record: CuringRecord): boolean {
  return record.actualRelease !== null;
}

export function isCuringReleasable(record: CuringRecord): boolean {
  return !isCuringReleased(record) && new Date(record.plannedCompletion).getTime() <= Date.now();
}
