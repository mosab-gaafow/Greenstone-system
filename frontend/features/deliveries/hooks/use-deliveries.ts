'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as deliveriesApi from '../api/deliveries.api';
import type { DeliveryFilters } from '../types/delivery.types';
import type { DeliveryFormValues, TransportFormValues } from '../schemas/delivery.schema';

export const deliveryKeys = {
  all: ['deliveries'] as const,
  lists: () => [...deliveryKeys.all, 'list'] as const,
  list: (filters: DeliveryFilters) => [...deliveryKeys.lists(), filters] as const,
  detail: (id: string) => [...deliveryKeys.all, 'detail', id] as const,
};

export function useDeliveries(filters: DeliveryFilters) {
  return useQuery({
    queryKey: deliveryKeys.list(filters),
    queryFn: () => deliveriesApi.fetchDeliveries(filters),
  });
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: deliveryKeys.detail(id),
    queryFn: () => deliveriesApi.fetchDelivery(id),
    enabled: !!id,
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DeliveryFormValues) => deliveriesApi.createDelivery(values),
    onSuccess: async (delivery) => {
      await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      // A delivery reserves stock
      await queryClient.invalidateQueries({ queryKey: ['finished-stock'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`${delivery.deliveryNumber} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The delivery could not be saved.'));
    },
  });
}

export function useCancelDelivery(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => deliveriesApi.cancelDelivery(id, reason),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${result.deliveryNumber} cancelled.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The delivery could not be cancelled.'));
    },
  });
}

export function useCompleteDelivery(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: deliveriesApi.CompleteDeliveryInput) =>
      deliveriesApi.completeDelivery(id, input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`${result.deliveryNumber} completed. Order is now ${result.orderStatus}.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The delivery could not be completed.'));
    },
  });
}

export function useDispatchDelivery(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deliveriesApi.dispatchDelivery(id),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${result.deliveryNumber} dispatched.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The delivery could not be dispatched.'));
    },
  });
}

export function useSetTransport(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: TransportFormValues) => deliveriesApi.setTransport(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Transport saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Transport could not be saved.'));
    },
  });
}

/** Counts for the summary cards above the delivery list. */
export function useDeliverySummary() {
  const [all, planned] = useQueries({
    queries: [
      {
        queryKey: deliveryKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => deliveriesApi.fetchDeliveries({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: deliveryKeys.list({ page: 1, pageSize: 1, status: 'PLANNED' }),
        queryFn: () =>
          deliveriesApi.fetchDeliveries({ page: 1, pageSize: 1, status: 'PLANNED' }),
      },
    ],
  });

  return {
    total: all.data?.meta.totalRecords,
    planned: planned.data?.meta.totalRecords,
    isLoading: all.isPending || planned.isPending,
  };
}
