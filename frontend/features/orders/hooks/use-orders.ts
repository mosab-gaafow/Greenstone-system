'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as ordersApi from '../api/orders.api';
import type { OrderFilters } from '../types/order.types';
import type { CancelOrderFormValues, OrderFormValues } from '../schemas/order.schema';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => ordersApi.fetchOrders(filters),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.fetchOrder(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OrderFormValues) => ordersApi.createOrder(values),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success(`${order.orderNumber} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The order could not be saved.'));
    },
  });
}

export function useCancelOrder(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CancelOrderFormValues) => ordersApi.cancelOrder(id, values),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success(`${order.orderNumber} cancelled.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The order could not be cancelled.'));
    },
  });
}

/** Counts for the summary cards above the order list. */
export function useOrderSummary() {
  const [all, prepaid, credit] = useQueries({
    queries: [
      {
        queryKey: orderKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => ordersApi.fetchOrders({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: orderKeys.list({ page: 1, pageSize: 1, paymentArrangement: 'PREPAID' }),
        queryFn: () => ordersApi.fetchOrders({ page: 1, pageSize: 1, paymentArrangement: 'PREPAID' }),
      },
      {
        queryKey: orderKeys.list({ page: 1, pageSize: 1, paymentArrangement: 'CREDIT' }),
        queryFn: () => ordersApi.fetchOrders({ page: 1, pageSize: 1, paymentArrangement: 'CREDIT' }),
      },
    ],
  });

  return {
    total: all.data?.meta.totalRecords,
    prepaid: prepaid.data?.meta.totalRecords,
    credit: credit.data?.meta.totalRecords,
    isLoading: all.isPending || prepaid.isPending || credit.isPending,
  };
}
