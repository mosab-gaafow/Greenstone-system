import { api, type PaginationMeta } from '@/lib/api-client';
import type { Delivery, DeliveryDetail, DeliveryFilters } from '../types/delivery.types';
import type { DeliveryFormValues } from '../schemas/delivery.schema';

export interface DeliveryListResult {
  deliveries: Delivery[];
  meta: PaginationMeta;
}

export async function fetchDeliveries(filters: DeliveryFilters): Promise<DeliveryListResult> {
  const { data, meta } = await api.get<Delivery[]>('/deliveries', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      status: filters.status,
      customerId: filters.customerId,
      orderId: filters.orderId,
    },
  });

  return { deliveries: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchDelivery(id: string): Promise<DeliveryDetail> {
  const { data } = await api.get<DeliveryDetail>(`/deliveries/${id}`);
  return data;
}

export async function createDelivery(values: DeliveryFormValues): Promise<DeliveryDetail> {
  const { data } = await api.post<DeliveryDetail>('/deliveries', {
    orderId: values.orderId,
    customerAddressId: values.customerAddressId,
    driverId: values.driverId,
    vehicleId: values.vehicleId,
    deliveryDate: values.deliveryDate,
    items: values.items.map((item) => ({
      orderItemId: item.orderItemId,
      productId: item.productId,
      plannedQuantity: item.plannedQuantity,
    })),
    creditOverrideReason: values.creditOverrideReason?.trim()
      ? values.creditOverrideReason.trim()
      : undefined,
  });
  return data;
}
