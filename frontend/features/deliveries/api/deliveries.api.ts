import { api, type PaginationMeta } from '@/lib/api-client';
import type { Delivery, DeliveryDetail, DeliveryFilters } from '../types/delivery.types';
import type { DeliveryFormValues, TransportFormValues } from '../schemas/delivery.schema';

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

// --- Phase 8B: Transport -----------------------------------------------

export interface TransportResult {
  transportRate: string;
  numberOfTrips: number;
  totalTransportCost: string;
  maxPiecesPerTruckSnapshot: number | null;
  autoCalculated: boolean;
}

export interface DispatchResult {
  id: string;
  deliveryNumber: string;
  status: 'DISPATCHED';
  dispatchedAt: string;
}

export async function dispatchDelivery(id: string): Promise<DispatchResult> {
  const { data } = await api.post<DispatchResult>(`/deliveries/${id}/dispatch`);
  return data;
}

export interface CompleteDeliveryInput {
  items: { orderItemId: string; deliveredQuantity: number; brokenQuantity: number }[];
}

export interface CompleteDeliveryResult {
  id: string;
  deliveryNumber: string;
  status: 'DELIVERED';
  completedAt: string;
  orderStatus: string;
}

export interface CancelDeliveryResult {
  id: string;
  deliveryNumber: string;
  status: 'CANCELLED';
  cancelledAt: string;
  reason: string;
}

export async function cancelDelivery(
  id: string,
  reason: string,
): Promise<CancelDeliveryResult> {
  const { data } = await api.post<CancelDeliveryResult>(`/deliveries/${id}/cancel`, { reason });
  return data;
}

export async function completeDelivery(
  id: string,
  input: CompleteDeliveryInput,
): Promise<CompleteDeliveryResult> {
  const { data } = await api.post<CompleteDeliveryResult>(`/deliveries/${id}/complete`, input);
  return data;
}

export async function setTransport(
  id: string,
  values: TransportFormValues,
): Promise<TransportResult> {
  const { data } = await api.patch<TransportResult>(`/deliveries/${id}/transport`, {
    transportRate: values.transportRate,
    numberOfTrips: values.numberOfTrips ?? undefined,
  });
  return data;
}
