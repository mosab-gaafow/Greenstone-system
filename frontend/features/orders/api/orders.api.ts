import { api, type PaginationMeta } from '@/lib/api-client';
import type { Order, OrderDetail, OrderFilters } from '../types/order.types';
import type { CancelOrderFormValues, OrderFormValues } from '../schemas/order.schema';

export interface OrderListResult {
  orders: Order[];
  meta: PaginationMeta;
}

export async function fetchOrders(filters: OrderFilters): Promise<OrderListResult> {
  const { data, meta } = await api.get<Order[]>('/orders', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      customerId: filters.customerId,
      paymentArrangement: filters.paymentArrangement,
      status: filters.status,
    },
  });

  return { orders: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchOrder(id: string): Promise<OrderDetail> {
  const { data } = await api.get<OrderDetail>(`/orders/${id}`);
  return data;
}

export async function createOrder(values: OrderFormValues): Promise<OrderDetail> {
  const { data } = await api.post<OrderDetail>('/orders', normaliseOrder(values));
  return data;
}

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

export async function fetchOrderDeliveryAvailability(
  id: string,
): Promise<DeliveryAvailabilityResult> {
  const { data } = await api.get<DeliveryAvailabilityResult>(
    `/orders/${id}/delivery-availability`,
  );
  return data;
}

export async function cancelOrder(
  id: string,
  values: CancelOrderFormValues,
): Promise<OrderDetail> {
  const { data } = await api.post<OrderDetail>(`/orders/${id}/cancel`, values);
  return data;
}

/** An empty override reason is not sent — the backend treats it as none given. */
function normaliseOrder(values: OrderFormValues) {
  return {
    customerId: values.customerId,
    customerAddressId: values.customerAddressId,
    paymentArrangement: values.paymentArrangement,
    items: values.items,
    creditOverrideReason: values.creditOverrideReason?.trim()
      ? values.creditOverrideReason.trim()
      : undefined,
  };
}
