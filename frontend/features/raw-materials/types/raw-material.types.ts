/**
 * Raw material types.
 *
 * See business-blueprint sections 2.12–2.15.
 */

export const RAW_MATERIAL_MOVEMENT_TYPES = [
  'OPENING',
  'PRODUCTION_USAGE',
  'PURCHASE_RECEIPT',
  'POSITIVE_ADJUSTMENT',
  'NEGATIVE_ADJUSTMENT',
  'CORRECTION',
] as const;
export type RawMaterialMovementType = (typeof RAW_MATERIAL_MOVEMENT_TYPES)[number];

export interface RawMaterial {
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

export interface RawMaterialFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}

export interface RawMaterialStock {
  rawMaterialId: string;
  /** Decimal string. */
  quantity: string;
  version: number;
  updatedAt: string;
}

export interface RawMaterialMovement {
  id: string;
  movementType: RawMaterialMovementType;
  /** Decimal string. Signed: positive increases stock, negative decreases it. */
  quantity: string;
  balanceAfter: string;
  relatedEntityId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

const MOVEMENT_TYPE_LABELS: Record<RawMaterialMovementType, string> = {
  OPENING: 'Opening',
  PRODUCTION_USAGE: 'Production usage',
  PURCHASE_RECEIPT: 'Purchase receipt',
  POSITIVE_ADJUSTMENT: 'Positive adjustment',
  NEGATIVE_ADJUSTMENT: 'Negative adjustment',
  CORRECTION: 'Correction',
};

export function rawMaterialMovementTypeLabel(value: RawMaterialMovementType): string {
  return MOVEMENT_TYPE_LABELS[value];
}
