'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as measurementUnitsApi from '../api/measurement-units.api';
import type { MeasurementUnitFilters } from '../types/measurement-unit.types';
import type { MeasurementUnitFormValues } from '../schemas/measurement-unit.schema';

export const measurementUnitKeys = {
  all: ['measurement-units'] as const,
  lists: () => [...measurementUnitKeys.all, 'list'] as const,
  list: (filters: MeasurementUnitFilters) => [...measurementUnitKeys.lists(), filters] as const,
};

export function useMeasurementUnits(filters: MeasurementUnitFilters) {
  return useQuery({
    queryKey: measurementUnitKeys.list(filters),
    queryFn: () => measurementUnitsApi.fetchMeasurementUnits(filters),
  });
}

/** Fetches every active unit in one page, for use in a picker. */
export function useActiveMeasurementUnitOptions() {
  return useQuery({
    queryKey: measurementUnitKeys.list({ page: 1, pageSize: 100, isActive: true }),
    queryFn: () => measurementUnitsApi.fetchMeasurementUnits({ page: 1, pageSize: 100, isActive: true }),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateMeasurementUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MeasurementUnitFormValues) => measurementUnitsApi.createMeasurementUnit(values),
    onSuccess: async (unit) => {
      await queryClient.invalidateQueries({ queryKey: measurementUnitKeys.all });
      toast.success(`${unit.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The unit could not be saved.'));
    },
  });
}

export function useUpdateMeasurementUnit(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MeasurementUnitFormValues) => measurementUnitsApi.updateMeasurementUnit(id, values),
    onSuccess: async (unit) => {
      await queryClient.invalidateQueries({ queryKey: measurementUnitKeys.all });
      toast.success(`${unit.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetMeasurementUnitActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      measurementUnitsApi.setMeasurementUnitActive(id, isActive),
    onSuccess: async (unit) => {
      await queryClient.invalidateQueries({ queryKey: measurementUnitKeys.all });
      toast.success(unit.isActive ? `${unit.name} activated.` : `${unit.name} deactivated.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The unit status could not be changed.'));
    },
  });
}
