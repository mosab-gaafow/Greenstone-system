import type { OrderPaymentArrangement, OrderStatus } from '../../generated/prisma/client.js';

/**
 * Order module types.
 *
 * See business-blueprint section 2.6, docs/implementation-plan.md Phase
 * 5B/6C-2, and docs/decisions/business-workflow-update-2026-08-02.md.
 */

export interface OrderItemInput {
  productId: string;
  quantity: number;
  /** Decimal string, never a JavaScript number. */
  agreedUnitPrice: string;
}

export interface OrderItemSummary {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  agreedUnitPrice: string;
  lineTotal: string;
  producedQuantity: number;
  allocatedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
}

export interface OrderSummary {
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

export interface OrderDetail extends Omit<OrderSummary, 'itemCount'> {
  addressLine: string;
  addressDirections: string | null;
  items: OrderItemSummary[];
}

/**
 * Direct order creation only — quotation conversion removed (Phase 6C-2,
 * 2026-08-02).
 *
 * `creditOverrideReason` only matters when the customer is BLOCKED and the
 * order is CREDIT — see business-blueprint section 2.24.
 */
export interface CreateOrderInput {
  customerId: string;
  customerAddressId: string;
  paymentArrangement: OrderPaymentArrangement;
  items: OrderItemInput[];
  creditOverrideReason?: string | undefined;
}

/** Cancellation requires a written reason — never optional, unlike Quotation's. */
export interface CancelOrderInput {
  reason: string;
}

export type OrderSortField = 'orderNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListOrdersFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  customerId?: string | undefined;
  paymentArrangement?: OrderPaymentArrangement | undefined;
  status?: OrderStatus | undefined;
  sortBy: OrderSortField;
  sortDirection: SortDirection;
}

export interface ListOrdersResult {
  orders: OrderSummary[];
  totalRecords: number;
}

// --- Phase 8 stock-first: delivery availability per order item -------------

export interface DeliveryAvailabilityItem {
  orderItemId: string;
  productId: string;
  productName: string;
  remainingQuantity: number;
  committedQuantity: number;
  stockAvailableQuantity: number;
  maxPlannableQuantity: number;
}

export interface DeliveryAvailabilityResult {
  orderId: string;
  items: DeliveryAvailabilityItem[];
}
