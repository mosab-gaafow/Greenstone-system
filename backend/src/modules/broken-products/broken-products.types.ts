import type { BrokenProductStage } from '../../generated/prisma/client.js';

/**
 * Broken product module types.
 *
 * See business-blueprint section 2.11 and docs/implementation-plan.md
 * Phase 6A.
 */

export interface BrokenProductRecordSummary {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  stage: BrokenProductStage;
  relatedEntityId: string | null;
  reason: string | null;
  recordedByUserId: string | null;
  createdAt: string;
}

export interface CreateBrokenProductRecordInput {
  productId: string;
  quantity: number;
  stage: BrokenProductStage;
  relatedEntityId?: string | null | undefined;
  reason?: string | null | undefined;
}

export interface ListBrokenProductRecordsFilters {
  page: number;
  pageSize: number;
  productId?: string | undefined;
  stage?: BrokenProductStage | undefined;
}

export interface ListBrokenProductRecordsResult {
  records: BrokenProductRecordSummary[];
  totalRecords: number;
}
