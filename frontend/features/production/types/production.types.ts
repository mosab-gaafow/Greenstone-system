/**
 * Production types.
 *
 * See business-blueprint section 2.7.
 */

export const PRODUCTION_PURPOSES = ['ORDER', 'GENERAL_STOCK'] as const;
export type ProductionPurpose = (typeof PRODUCTION_PURPOSES)[number];

export const PRODUCTION_STATUSES = ['IN_PROGRESS', 'COMPLETED'] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const CURING_DURATIONS = ['TWO_DAYS', 'THREE_DAYS'] as const;
export type CuringDuration = (typeof CURING_DURATIONS)[number];

export interface ProductionItem {
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

export interface RawMaterialUsage {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  measurementUnitSymbol: string | null;
  quantity: string;
}

export interface Production {
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

export interface ProductionDetail extends Omit<Production, 'itemCount'> {
  items: ProductionItem[];
  rawMaterialUsages: RawMaterialUsage[];
}

export interface ProductionFilters {
  page: number;
  pageSize: number;
  search?: string;
  purpose?: ProductionPurpose;
  status?: ProductionStatus;
}

const PURPOSE_LABELS: Record<ProductionPurpose, string> = {
  ORDER: 'For an order',
  GENERAL_STOCK: 'General stock',
};

export function productionPurposeLabel(value: ProductionPurpose): string {
  return PURPOSE_LABELS[value];
}

const STATUS_LABELS: Record<ProductionStatus, string> = {
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

export function productionStatusLabel(value: ProductionStatus): string {
  return STATUS_LABELS[value];
}

const DURATION_LABELS: Record<CuringDuration, string> = {
  TWO_DAYS: '2 days',
  THREE_DAYS: '3 days',
};

export function curingDurationLabel(value: CuringDuration): string {
  return DURATION_LABELS[value];
}

export const CURING_DURATION_OPTIONS = CURING_DURATIONS.map((value) => ({
  value,
  label: DURATION_LABELS[value],
}));
