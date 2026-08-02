'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as customersApi from '../api/customers.api';
import type { CustomerFilters } from '../types/customer.types';
import type { AddressFormValues, CustomerFormValues } from '../schemas/customer.schema';

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
};

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => customersApi.fetchCustomers(filters),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customersApi.fetchCustomer(id),
  });
}

/**
 * Counts for the summary cards above the customer list.
 *
 * Reuses the existing list endpoint with `pageSize: 1` — the count is read
 * from `meta.totalRecords`, so this needs no new backend endpoint. Three
 * small requests (all, active, inactive) rather than one large one.
 */
export function useCustomerSummary() {
  const [all, active, inactive] = useQueries({
    queries: [
      {
        queryKey: customerKeys.list({ page: 1, pageSize: 1 }),
        queryFn: () => customersApi.fetchCustomers({ page: 1, pageSize: 1 }),
      },
      {
        queryKey: customerKeys.list({ page: 1, pageSize: 1, isActive: true }),
        queryFn: () => customersApi.fetchCustomers({ page: 1, pageSize: 1, isActive: true }),
      },
      {
        queryKey: customerKeys.list({ page: 1, pageSize: 1, isActive: false }),
        queryFn: () => customersApi.fetchCustomers({ page: 1, pageSize: 1, isActive: false }),
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => customersApi.createCustomer(values),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success(`${customer.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The customer could not be added.'));
    },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => customersApi.updateCustomer(id, values),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success(`${customer.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetCustomerActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      customersApi.setCustomerActive(id, isActive),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success(
        customer.isActive ? `${customer.name} activated.` : `${customer.name} deactivated.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The customer status could not be changed.'));
    },
  });
}

export function useSaveAddress(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, values }: { addressId?: string; values: AddressFormValues }) =>
      addressId
        ? customersApi.updateAddress(customerId, addressId, values)
        : customersApi.createAddress(customerId, values),
    onSuccess: async (_customer, variables) => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success(variables.addressId ? 'Site saved.' : 'Site added.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The site could not be saved.'));
    },
  });
}

export function useSetAddressActive(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, isActive }: { addressId: string; isActive: boolean }) =>
      customersApi.setAddressActive(customerId, addressId, isActive),
    onSuccess: async (_customer, variables) => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success(variables.isActive ? 'Site activated.' : 'Site deactivated.');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The site status could not be changed.'));
    },
  });
}
