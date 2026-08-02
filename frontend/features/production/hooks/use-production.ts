'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as productionApi from '../api/production.api';
import type { ProductionFilters } from '../types/production.types';
import type { ProductionFormValues } from '../schemas/production.schema';

export const productionKeys = {
  all: ['production'] as const,
  lists: () => [...productionKeys.all, 'list'] as const,
  list: (filters: ProductionFilters) => [...productionKeys.lists(), filters] as const,
  detail: (id: string) => [...productionKeys.all, 'detail', id] as const,
};

export function useProductionBatches(filters: ProductionFilters) {
  return useQuery({
    queryKey: productionKeys.list(filters),
    queryFn: () => productionApi.fetchProductionBatches(filters),
  });
}

export function useProductionBatch(id: string) {
  return useQuery({
    queryKey: productionKeys.detail(id),
    queryFn: () => productionApi.fetchProductionBatch(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateProductionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProductionFormValues) => productionApi.createProductionBatch(values),
    onSuccess: async (batch) => {
      await queryClient.invalidateQueries({ queryKey: productionKeys.all });
      // Production affects raw-material and finished stock, and (for
      // order-purpose runs) the order's own produced/allocated quantities.
      await queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['curing'] });
      toast.success(`${batch.productionNumber} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The production run could not be saved.'));
    },
  });
}
