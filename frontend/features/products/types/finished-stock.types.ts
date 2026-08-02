/**
 * Finished stock types.
 *
 * See business-blueprint section 2.9.
 */

export const FINISHED_STOCK_MOVEMENT_TYPES = [
  'OPENING',
  'CURING_RELEASE',
  'GENERAL_STOCK_RELEASE',
  'DELIVERY_DISPATCH',
  'BROKEN',
  'POSITIVE_ADJUSTMENT',
  'NEGATIVE_ADJUSTMENT',
  'CORRECTION',
] as const;
export type FinishedStockMovementType = (typeof FINISHED_STOCK_MOVEMENT_TYPES)[number];

export interface FinishedStockBalance {
  productId: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  version: number;
  updatedAt: string;
}

export interface FinishedStockMovement {
  id: string;
  movementType: FinishedStockMovementType;
  quantity: number;
  balanceAfter: number;
  relatedEntityId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

const MOVEMENT_TYPE_LABELS: Record<FinishedStockMovementType, string> = {
  OPENING: 'Opening',
  CURING_RELEASE: 'Curing release',
  GENERAL_STOCK_RELEASE: 'General stock release',
  DELIVERY_DISPATCH: 'Delivery dispatch',
  BROKEN: 'Broken',
  POSITIVE_ADJUSTMENT: 'Positive adjustment',
  NEGATIVE_ADJUSTMENT: 'Negative adjustment',
  CORRECTION: 'Correction',
};

export function finishedStockMovementTypeLabel(value: FinishedStockMovementType): string {
  return MOVEMENT_TYPE_LABELS[value];
}
