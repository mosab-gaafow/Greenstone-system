'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as vehiclesApi from '../api/vehicles.api';
import type { VehicleFilters } from '../types/vehicle.types';
import type { VehicleFormValues } from '../schemas/vehicle.schema';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (filters: VehicleFilters) => [...vehicleKeys.lists(), filters] as const,
  detail: (id: string) => [...vehicleKeys.all, 'detail', id] as const,
};

export function useVehicles(filters: VehicleFilters) {
  return useQuery({
    queryKey: vehicleKeys.list(filters),
    queryFn: () => vehiclesApi.fetchVehicles(filters),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => vehiclesApi.fetchVehicle(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: VehicleFormValues) => vehiclesApi.createVehicle(values),
    onSuccess: async (vehicle) => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success(`${vehicle.registrationNumber} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The vehicle could not be added.'));
    },
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: VehicleFormValues) => vehiclesApi.updateVehicle(id, values),
    onSuccess: async (vehicle) => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success(`${vehicle.registrationNumber} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetVehicleActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      vehiclesApi.setVehicleActive(id, isActive),
    onSuccess: async (vehicle) => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast.success(
        vehicle.isActive
          ? `${vehicle.registrationNumber} activated.`
          : `${vehicle.registrationNumber} deactivated.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The vehicle status could not be changed.'));
    },
  });
}

/** Counts for the summary cards above the vehicle list. */
export function useVehicleSummary() {
  const [all, active, inactive] = useQueries({
    queries: [
      {
        queryKey: vehicleKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => vehiclesApi.fetchVehicles({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: vehicleKeys.list({ page: 1, pageSize: 1, isActive: true }),
        queryFn: () => vehiclesApi.fetchVehicles({ page: 1, pageSize: 1, isActive: true }),
      },
      {
        queryKey: vehicleKeys.list({ page: 1, pageSize: 1, isActive: false }),
        queryFn: () => vehiclesApi.fetchVehicles({ page: 1, pageSize: 1, isActive: false }),
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
