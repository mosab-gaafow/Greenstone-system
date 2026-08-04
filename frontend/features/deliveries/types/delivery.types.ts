/**
 * Delivery types (Phase 8A).
 *
 * Mirrors the backend contract. See business-blueprint section 2.19 and
 * docs/implementation-plan.md §12.
 */

export const DELIVERY_STATUSES = ['PLANNED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface DeliveryItem {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  reservedQuantity: number;
  dispatchedQuantity: number;
  deliveredQuantity: number;
  brokenQuantity: number;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  addressLabel: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleRegistrationNumber: string;
  vehicleOwnerId: string;
  payeeName: string;
  deliveryDate: string;
  status: DeliveryStatus;
  itemCount: number;
  totalPlannedQuantity: number;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDetail extends Omit<Delivery, 'itemCount' | 'totalPlannedQuantity'> {
  customerAddressId: string;
  addressLine: string;
  addressDirections: string | null;
  payeePhone: string;
  transportRate: string | null;
  numberOfTrips: number | null;
  totalTransportCost: string | null;
  maxPiecesPerTruckSnapshot: number | null;
  cancelledReason: string | null;
  dispatchedByUserId: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  correctionReason: string | null;
  items: DeliveryItem[];
}

export interface DeliveryFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: DeliveryStatus;
  customerId?: string;
  orderId?: string;
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  PLANNED: 'Planned',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function deliveryStatusLabel(value: DeliveryStatus): string {
  return STATUS_LABELS[value];
}

export const DELIVERY_STATUS_OPTIONS = DELIVERY_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));
