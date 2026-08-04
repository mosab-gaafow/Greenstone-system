import type { DeliveryStatus } from '../../generated/prisma/client.js';

/**
 * Delivery module types (Phase 8A). See business-blueprint section 2.19
 * and docs/implementation-plan.md §12.
 *
 * Phase 8A implements PLANNED deliveries only — create, list, read.
 * Dispatch (8C), completion (8D), cancellation (8E), and correction (8F)
 * are later sub-phases.
 */

export interface DeliveryItemInput {
  orderItemId: string;
  productId: string;
  plannedQuantity: number;
}

export interface CreateDeliveryInput {
  orderId: string;
  customerAddressId: string;
  driverId: string;
  vehicleId: string;
  deliveryDate: Date;
  items: DeliveryItemInput[];
  creditOverrideReason?: string | undefined;
}

export interface DeliveryItemSummary {
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

export interface DeliverySummary {
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

export interface DeliveryDetail {
  id: string;
  deliveryNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerAddressId: string;
  addressLabel: string;
  addressLine: string;
  addressDirections: string | null;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleRegistrationNumber: string;
  vehicleOwnerId: string;
  payeeName: string;
  payeePhone: string;
  deliveryDate: string;
  status: DeliveryStatus;
  transportRate: string | null;
  numberOfTrips: number | null;
  totalTransportCost: string | null;
  maxPiecesPerTruckSnapshot: number | null;
  cancelledReason: string | null;
  dispatchedByUserId: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  correctionReason: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  items: DeliveryItemSummary[];
}

export type DeliverySortField = 'deliveryNumber' | 'createdAt' | 'deliveryDate';
export type SortDirection = 'asc' | 'desc';

export interface ListDeliveriesFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  status?: DeliveryStatus | undefined;
  customerId?: string | undefined;
  orderId?: string | undefined;
  sortBy: DeliverySortField;
  sortDirection: SortDirection;
}

export interface ListDeliveriesResult {
  deliveries: DeliverySummary[];
  totalRecords: number;
}
