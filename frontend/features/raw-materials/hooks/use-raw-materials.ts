'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as rawMaterialsApi from '../api/raw-materials.api';
import type { RawMaterialFilters } from '../types/raw-material.types';
import type {
  AdjustStockFormValues,
  OpeningStockFormValues,
  RawMaterialFormValues,
} from '../schemas/raw-material.schema';

export const rawMaterialKeys = {
  all: ['raw-materials'] as const,
  lists: () => [...rawMaterialKeys.all, 'list'] as const,
  list: (filters: RawMaterialFilters) => [...rawMaterialKeys.lists(), filters] as const,
  detail: (id: string) => [...rawMaterialKeys.all, 'detail', id] as const,
  stock: (id: string) => [...rawMaterialKeys.all, 'stock', id] as const,
  movements: (id: string, page: number) => [...rawMaterialKeys.all, 'movements', id, page] as const,
};

export function useRawMaterials(filters: RawMaterialFilters) {
  return useQuery({
    queryKey: rawMaterialKeys.list(filters),
    queryFn: () => rawMaterialsApi.fetchRawMaterials(filters),
  });
}

export function useRawMaterial(id: string) {
  return useQuery({
    queryKey: rawMaterialKeys.detail(id),
    queryFn: () => rawMaterialsApi.fetchRawMaterial(id),
  });
}

export function useRawMaterialStock(id: string) {
  return useQuery({
    queryKey: rawMaterialKeys.stock(id),
    queryFn: () => rawMaterialsApi.fetchRawMaterialStock(id),
  });
}

export function useRawMaterialMovements(id: string, page: number) {
  return useQuery({
    queryKey: rawMaterialKeys.movements(id, page),
    queryFn: () => rawMaterialsApi.fetchRawMaterialMovements(id, page, 10),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: RawMaterialFormValues) => rawMaterialsApi.createRawMaterial(values),
    onSuccess: async (material) => {
      await queryClient.invalidateQueries({ queryKey: rawMaterialKeys.all });
      toast.success(`${material.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The raw material could not be saved.'));
    },
  });
}

export function useUpdateRawMaterial(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: RawMaterialFormValues) => rawMaterialsApi.updateRawMaterial(id, values),
    onSuccess: async (material) => {
      await queryClient.invalidateQueries({ queryKey: rawMaterialKeys.all });
      toast.success(`${material.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetRawMaterialActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      rawMaterialsApi.setRawMaterialActive(id, isActive),
    onSuccess: async (material) => {
      await queryClient.invalidateQueries({ queryKey: rawMaterialKeys.all });
      toast.success(
        material.isActive ? `${material.name} activated.` : `${material.name} deactivated.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The status could not be changed.'));
    },
  });
}

export function useSetOpeningStock(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OpeningStockFormValues) => rawMaterialsApi.setOpeningStock(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rawMaterialKeys.stock(id) });
      await queryClient.invalidateQueries({ queryKey: rawMaterialKeys.all });
      toast.success('Opening stock saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The opening stock could not be saved.'));
    },
  });
}

export function useAdjustStock(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: AdjustStockFormValues) => rawMaterialsApi.adjustStock(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rawMaterialKeys.stock(id) });
      await queryClient.invalidateQueries({ queryKey: rawMaterialKeys.all });
      toast.success('Adjustment saved.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The adjustment could not be saved.'));
    },
  });
}
