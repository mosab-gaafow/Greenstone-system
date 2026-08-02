'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as curingApi from '../api/curing.api';
import type { CuringFilters } from '../types/curing.types';
import type { ChangeCuringDurationFormValues, ReleaseCuringFormValues } from '../schemas/curing.schema';

export const curingKeys = {
  all: ['curing'] as const,
  lists: () => [...curingKeys.all, 'list'] as const,
  list: (filters: CuringFilters) => [...curingKeys.lists(), filters] as const,
  detail: (id: string) => [...curingKeys.all, 'detail', id] as const,
};

export function useCuringRecords(filters: CuringFilters) {
  return useQuery({
    queryKey: curingKeys.list(filters),
    queryFn: () => curingApi.fetchCuringRecords(filters),
  });
}

export function useCuringRecord(id: string) {
  return useQuery({
    queryKey: curingKeys.detail(id),
    queryFn: () => curingApi.fetchCuringRecord(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

async function invalidateEverythingAffected(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: curingKeys.all });
  await queryClient.invalidateQueries({ queryKey: ['production'] });
  await queryClient.invalidateQueries({ queryKey: ['products'] });
  await queryClient.invalidateQueries({ queryKey: ['orders'] });
}

export function useChangeCuringDuration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ChangeCuringDurationFormValues) => curingApi.changeCuringDuration(id, values),
    onSuccess: async () => {
      await invalidateEverythingAffected(queryClient);
      toast.success('Curing duration updated.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The duration could not be changed.'));
    },
  });
}

export function useReleaseCuring(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ReleaseCuringFormValues) => curingApi.releaseCuring(id, values),
    onSuccess: async () => {
      await invalidateEverythingAffected(queryClient);
      toast.success('Curing released.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The curing record could not be released.'));
    },
  });
}
