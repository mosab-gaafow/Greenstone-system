/**
 * Order types.
 *
 * Mirrors the backend contract. See business-blueprint section 2.6.
 */

export const ORDER_PAYMENT_TYPES = ['CASH', 'CREDIT'] as const;
export type OrderPaymentType = (typeof ORDER_PAYMENT_TYPES)[number];

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
  sourceQuotationId: string | null;
  paymentType: OrderPaymentType;
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
  paymentType?: OrderPaymentType;
}

const PAYMENT_TYPE_LABELS: Record<OrderPaymentType, string> = {
  CASH: 'Cash',
  CREDIT: 'Credit',
};

export function orderPaymentTypeLabel(value: OrderPaymentType): string {
  return PAYMENT_TYPE_LABELS[value];
}

export const ORDER_PAYMENT_TYPE_OPTIONS = ORDER_PAYMENT_TYPES.map((value) => ({
  value,
  label: PAYMENT_TYPE_LABELS[value],
}));
