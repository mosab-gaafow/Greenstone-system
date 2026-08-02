'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as suppliersApi from '../api/suppliers.api';
import type { SupplierFilters } from '../types/supplier.types';
import type { SupplierFormValues } from '../schemas/supplier.schema';

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters: SupplierFilters) => [...supplierKeys.lists(), filters] as const,
  detail: (id: string) => [...supplierKeys.all, 'detail', id] as const,
};

export function useSuppliers(filters: SupplierFilters) {
  return useQuery({
    queryKey: supplierKeys.list(filters),
    queryFn: () => suppliersApi.fetchSuppliers(filters),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => suppliersApi.fetchSupplier(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SupplierFormValues) => suppliersApi.createSupplier(values),
    onSuccess: async (supplier) => {
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success(`${supplier.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The supplier could not be added.'));
    },
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SupplierFormValues) => suppliersApi.updateSupplier(id, values),
    onSuccess: async (supplier) => {
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success(`${supplier.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetSupplierActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      suppliersApi.setSupplierActive(id, isActive),
    onSuccess: async (supplier) => {
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success(
        supplier.isActive ? `${supplier.name} activated.` : `${supplier.name} deactivated.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The supplier status could not be changed.'));
    },
  });
}

/** Counts for the summary cards above the supplier list. */
export function useSupplierSummary() {
  const [all, active, inactive] = useQueries({
    queries: [
      {
        queryKey: supplierKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => suppliersApi.fetchSuppliers({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: supplierKeys.list({ page: 1, pageSize: 1, isActive: true }),
        queryFn: () => suppliersApi.fetchSuppliers({ page: 1, pageSize: 1, isActive: true }),
      },
      {
        queryKey: supplierKeys.list({ page: 1, pageSize: 1, isActive: false }),
        queryFn: () => suppliersApi.fetchSuppliers({ page: 1, pageSize: 1, isActive: false }),
      },
    ],
  });

  return {
    total: all.data?.meta.totalRecords,
    active: active.data?.meta.totalRecords,
    inactive: inactive.data?.meta.totalRecords,
    isLoading: all.isPending || active.isPending || inactive.isPending,
  };
}
