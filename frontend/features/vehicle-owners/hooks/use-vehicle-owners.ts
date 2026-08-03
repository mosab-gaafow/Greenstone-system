'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as vehicleOwnersApi from '../api/vehicle-owners.api';
import type { VehicleOwnerFilters } from '../types/vehicle-owner.types';
import type { VehicleOwnerFormValues } from '../schemas/vehicle-owner.schema';

export const vehicleOwnerKeys = {
  all: ['vehicle-owners'] as const,
  lists: () => [...vehicleOwnerKeys.all, 'list'] as const,
  list: (filters: VehicleOwnerFilters) => [...vehicleOwnerKeys.lists(), filters] as const,
  detail: (id: string) => [...vehicleOwnerKeys.all, 'detail', id] as const,
};

export function useVehicleOwners(filters: VehicleOwnerFilters) {
  return useQuery({
    queryKey: vehicleOwnerKeys.list(filters),
    queryFn: () => vehicleOwnersApi.fetchVehicleOwners(filters),
  });
}

export function useVehicleOwner(id: string) {
  return useQuery({
    queryKey: vehicleOwnerKeys.detail(id),
    queryFn: () => vehicleOwnersApi.fetchVehicleOwner(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateVehicleOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: VehicleOwnerFormValues) => vehicleOwnersApi.createVehicleOwner(values),
    onSuccess: async (vehicleOwner) => {
      await queryClient.invalidateQueries({ queryKey: vehicleOwnerKeys.all });
      toast.success(`${vehicleOwner.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The vehicle owner could not be added.'));
    },
  });
}

export function useUpdateVehicleOwner(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: VehicleOwnerFormValues) => vehicleOwnersApi.updateVehicleOwner(id, values),
    onSuccess: async (vehicleOwner) => {
      await queryClient.invalidateQueries({ queryKey: vehicleOwnerKeys.all });
      toast.success(`${vehicleOwner.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetVehicleOwnerActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      vehicleOwnersApi.setVehicleOwnerActive(id, isActive),
    onSuccess: async (vehicleOwner) => {
      await queryClient.invalidateQueries({ queryKey: vehicleOwnerKeys.all });
      toast.success(
        vehicleOwner.isActive
          ? `${vehicleOwner.name} activated.`
          : `${vehicleOwner.name} deactivated.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The vehicle owner status could not be changed.'));
    },
  });
}

/** Counts for the summary cards above the vehicle-owner list. */
export function useVehicleOwnerSummary() {
  const [all, active, inactive] = useQueries({
    queries: [
      {
        queryKey: vehicleOwnerKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => vehicleOwnersApi.fetchVehicleOwners({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: vehicleOwnerKeys.list({ page: 1, pageSize: 1, isActive: true }),
        queryFn: () => vehicleOwnersApi.fetchVehicleOwners({ page: 1, pageSize: 1, isActive: true }),
      },
      {
        queryKey: vehicleOwnerKeys.list({ page: 1, pageSize: 1, isActive: false }),
        queryFn: () => vehicleOwnersApi.fetchVehicleOwners({ page: 1, pageSize: 1, isActive: false }),
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
