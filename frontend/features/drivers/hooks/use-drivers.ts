'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as driversApi from '../api/drivers.api';
import type { DriverFilters } from '../types/driver.types';
import type { DriverFormValues } from '../schemas/driver.schema';

export const driverKeys = {
  all: ['drivers'] as const,
  lists: () => [...driverKeys.all, 'list'] as const,
  list: (filters: DriverFilters) => [...driverKeys.lists(), filters] as const,
  detail: (id: string) => [...driverKeys.all, 'detail', id] as const,
};

export function useDrivers(filters: DriverFilters) {
  return useQuery({
    queryKey: driverKeys.list(filters),
    queryFn: () => driversApi.fetchDrivers(filters),
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => driversApi.fetchDriver(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DriverFormValues) => driversApi.createDriver(values),
    onSuccess: async (driver) => {
      await queryClient.invalidateQueries({ queryKey: driverKeys.all });
      toast.success(`${driver.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The driver could not be added.'));
    },
  });
}

export function useUpdateDriver(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DriverFormValues) => driversApi.updateDriver(id, values),
    onSuccess: async (driver) => {
      await queryClient.invalidateQueries({ queryKey: driverKeys.all });
      toast.success(`${driver.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetDriverActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      driversApi.setDriverActive(id, isActive),
    onSuccess: async (driver) => {
      await queryClient.invalidateQueries({ queryKey: driverKeys.all });
      toast.success(driver.isActive ? `${driver.name} activated.` : `${driver.name} deactivated.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The driver status could not be changed.'));
    },
  });
}

/** Counts for the summary cards above the driver list. */
export function useDriverSummary() {
  const [all, active, inactive] = useQueries({
    queries: [
      {
        queryKey: driverKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => driversApi.fetchDrivers({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: driverKeys.list({ page: 1, pageSize: 1, isActive: true }),
        queryFn: () => driversApi.fetchDrivers({ page: 1, pageSize: 1, isActive: true }),
      },
      {
        queryKey: driverKeys.list({ page: 1, pageSize: 1, isActive: false }),
        queryFn: () => driversApi.fetchDrivers({ page: 1, pageSize: 1, isActive: false }),
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
