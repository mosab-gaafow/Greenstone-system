import type { OrderPaymentType } from '../../generated/prisma/client.js';

/**
 * Order module types.
 *
 * See business-blueprint section 2.6 and docs/implementation-plan.md Phase 5B.
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
  sourceQuotationId: string | null;
  paymentType: OrderPaymentType;
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
 * One request shape, two sources: exactly one of `sourceQuotationId` or
 * (`customerId` + `items`) must be present — the service enforces this.
 *
 * `creditOverrideReason` only matters when the customer is BLOCKED and the
 * order is CREDIT — see business-blueprint section 2.24.
 */
export interface CreateOrderInput {
  customerId?: string | undefined;
  sourceQuotationId?: string | undefined;
  customerAddressId: string;
  paymentType: OrderPaymentType;
  items?: OrderItemInput[] | undefined;
  creditOverrideReason?: string | undefined;
}

export type OrderSortField = 'orderNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListOrdersFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  customerId?: string | undefined;
  paymentType?: OrderPaymentType | undefined;
  sortBy: OrderSortField;
  sortDirection: SortDirection;
}

export interface ListOrdersResult {
  orders: OrderSummary[];
  totalRecords: number;
}
