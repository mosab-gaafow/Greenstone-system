/**
 * Order types.
 *
 * Mirrors the backend contract. See business-blueprint section 2.6 and
 * docs/decisions/business-workflow-update-2026-08-02.md (Phase 6C-2,
 * 2026-08-02): `paymentType` (`CASH`/`CREDIT`) was renamed to
 * `paymentArrangement` (`PREPAID`/`CREDIT`), and a system-controlled
 * `status` was added. Quotation conversion was removed — orders are always
 * created directly.
 */

export const ORDER_PAYMENT_ARRANGEMENTS = ['PREPAID', 'CREDIT'] as const;
export type OrderPaymentArrangement = (typeof ORDER_PAYMENT_ARRANGEMENTS)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'IN_PRODUCTION',
  'CURING',
  'READY_FOR_DELIVERY',
  'PARTIALLY_DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  /** Decimal string, e.g. "150.50". */
  agreedUnitPrice: string;
  lineTotal: string;
  /** Filled in by later phases (Production, Delivery) — always 0 for now. */
  producedQuantity: number;
  allocatedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerAddressId: string;
  addressLabel: string;
  paymentArrangement: OrderPaymentArrangement;
  status: OrderStatus;
  statusReason: string | null;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends Omit<Order, 'itemCount'> {
  addressLine: string;
  addressDirections: string | null;
  items: OrderItem[];
}

export interface OrderFilters {
  page: number;
  pageSize: number;
  search?: string;
  customerId?: string;
  paymentArrangement?: OrderPaymentArrangement;
  status?: OrderStatus;
}

const PAYMENT_ARRANGEMENT_LABELS: Record<OrderPaymentArrangement, string> = {
  PREPAID: 'Prepaid',
  CREDIT: 'Credit',
};

export function orderPaymentArrangementLabel(value: OrderPaymentArrangement): string {
  return PAYMENT_ARRANGEMENT_LABELS[value];
}

export const ORDER_PAYMENT_ARRANGEMENT_OPTIONS = ORDER_PAYMENT_ARRANGEMENTS.map((value) => ({
  value,
  label: PAYMENT_ARRANGEMENT_LABELS[value],
}));

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  IN_PRODUCTION: 'In production',
  CURING: 'Curing',
  READY_FOR_DELIVERY: 'Ready for delivery',
  PARTIALLY_DELIVERED: 'Partially delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function orderStatusLabel(value: OrderStatus): string {
  return STATUS_LABELS[value];
}

/** Matches the backend's `CANCELLABLE_STATUSES` in `orders.service.ts`. */
export function isOrderCancellable(status: OrderStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}
