'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as employeesApi from '../api/employees.api';
import type { EmployeeFilters } from '../types/employee.types';
import type { EmployeeFormValues } from '../schemas/employee.schema';

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => employeesApi.fetchEmployees(filters),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesApi.fetchEmployee(id),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: EmployeeFormValues) => employeesApi.createEmployee(values),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success(`${employee.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The employee could not be added.'));
    },
  });
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: EmployeeFormValues) => employeesApi.updateEmployee(id, values),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success(`${employee.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetEmployeeActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      employeesApi.setEmployeeActive(id, isActive),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      toast.success(
        employee.isActive ? `${employee.name} activated.` : `${employee.name} deactivated.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The employee status could not be changed.'));
    },
  });
}

/** Counts for the summary cards above the employee list. */
export function useEmployeeSummary() {
  const [all, active, inactive] = useQueries({
    queries: [
      {
        queryKey: employeeKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => employeesApi.fetchEmployees({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: employeeKeys.list({ page: 1, pageSize: 1, isActive: true }),
        queryFn: () => employeesApi.fetchEmployees({ page: 1, pageSize: 1, isActive: true }),
      },
      {
        queryKey: employeeKeys.list({ page: 1, pageSize: 1, isActive: false }),
        queryFn: () => employeesApi.fetchEmployees({ page: 1, pageSize: 1, isActive: false }),
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
