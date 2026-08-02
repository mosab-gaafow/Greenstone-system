'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as finishedStockApi from '../api/finished-stock.api';
import type {
  AdjustFinishedStockFormValues,
  OpeningFinishedStockFormValues,
  RecordBrokenStockFormValues,
} from '../schemas/finished-stock.schema';

export const finishedStockKeys = {
  balance: (productId: string) => ['products', productId, 'finished-stock'] as const,
  movements: (productId: string, page: number) =>
    ['products', productId, 'finished-stock', 'movements', page] as const,
};

export function useFinishedStock(productId: string) {
  return useQuery({
    queryKey: finishedStockKeys.balance(productId),
    queryFn: () => finishedStockApi.fetchFinishedStock(productId),
  });
}

export function useFinishedStockMovements(productId: string, page: number) {
  return useQuery({
    queryKey: finishedStockKeys.movements(productId, page),
    queryFn: () => finishedStockApi.fetchFinishedStockMovements(productId, page, 10),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function invalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ['products', productId] });
}

export function useSetOpeningFinishedStock(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OpeningFinishedStockFormValues) =>
      finishedStockApi.setOpeningFinishedStock(productId, values),
    onSuccess: async () => {
      await invalidate(queryClient, productId);
      toast.success('Opening stock saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The opening stock could not be saved.'));
    },
  });
}

export function useAdjustFinishedStock(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: AdjustFinishedStockFormValues) =>
      finishedStockApi.adjustFinishedStock(productId, values),
    onSuccess: async () => {
      await invalidate(queryClient, productId);
      toast.success('Adjustment saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The adjustment could not be saved.'));
    },
  });
}

export function useRecordBrokenFinishedStock(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: RecordBrokenStockFormValues) =>
      finishedStockApi.recordBrokenFinishedStock(productId, values),
    onSuccess: async () => {
      await invalidate(queryClient, productId);
      toast.success('Broken stock recorded.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The broken stock could not be recorded.'));
    },
  });
}
