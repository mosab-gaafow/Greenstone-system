'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as purchasesApi from '../api/purchases.api';
import type { PurchaseFilters } from '../types/purchase.types';
import type { PurchaseFormValues } from '../schemas/purchase.schema';

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  list: (filters: PurchaseFilters) => [...purchaseKeys.lists(), filters] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
};

export function usePurchases(filters: PurchaseFilters) {
  return useQuery({
    queryKey: purchaseKeys.list(filters),
    queryFn: () => purchasesApi.fetchPurchases(filters),
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: () => purchasesApi.fetchPurchase(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PurchaseFormValues) => purchasesApi.createPurchase(values),
    onSuccess: async (purchase) => {
      await queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      // A purchase credits raw-material stock and the supplier's outstanding balance.
      await queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(`${purchase.purchaseNumber} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The purchase could not be saved.'));
    },
  });
}
