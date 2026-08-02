import type {
  CuringDuration,
  ProductionPurpose,
  ProductionStatus,
} from '../../generated/prisma/client.js';

/**
 * Production module types.
 *
 * See business-blueprint section 2.7 and docs/implementation-plan.md
 * Phase 6B.
 */

export interface ProductionItemInput {
  productId: string;
  /** One pallet is always 12 pieces — the backend calculates `producedQuantity`. */
  pallets: number;
  /** Broken before curing — a separate capture point from curing's own broken quantity. */
  brokenQuantity: number;
  curingDuration: CuringDuration;
}

export interface RawMaterialUsageInput {
  rawMaterialId: string;
  /** Decimal string — actual quantity used, never a fixed formula. */
  quantity: string;
}

export interface CreateProductionInput {
  productionDate: Date;
  purpose: ProductionPurpose;
  /** Required when `purpose` is `ORDER`, must be absent for `GENERAL_STOCK`. */
  orderId?: string | undefined;
  items: ProductionItemInput[];
  rawMaterialUsages: RawMaterialUsageInput[];
}

export interface ProductionItemSummary {
  id: string;
  productId: string;
  productName: string;
  pallets: number;
  producedQuantity: number;
  brokenQuantity: number;
  usableQuantity: number;
  allocatedQuantity: number;
  excessQuantity: number;
  curingRecordId: string | null;
}

export interface RawMaterialUsageSummary {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  measurementUnitSymbol: string | null;
  /** Decimal string. */
  quantity: string;
}

export interface ProductionSummary {
  id: string;
  productionNumber: string;
  productionDate: string;
  purpose: ProductionPurpose;
  orderId: string | null;
  orderNumber: string | null;
  status: ProductionStatus;
  itemCount: number;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionDetail extends Omit<ProductionSummary, 'itemCount'> {
  items: ProductionItemSummary[];
  rawMaterialUsages: RawMaterialUsageSummary[];
}

export type ProductionSortField = 'productionNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListProductionFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  purpose?: ProductionPurpose | undefined;
  orderId?: string | undefined;
  status?: ProductionStatus | undefined;
  sortBy: ProductionSortField;
  sortDirection: SortDirection;
}

export interface ListProductionResult {
  batches: ProductionSummary[];
  totalRecords: number;
}

/**
 * What `curing.service.ts` needs to determine the order/excess split at
 * release time, without reading `production`'s tables directly.
 */
export interface ProductionItemForRelease {
  id: string;
  productId: string;
  productionBatchId: string;
  allocatedQuantity: number;
  allocations: { id: string; orderItemId: string; quantity: number }[];
}
