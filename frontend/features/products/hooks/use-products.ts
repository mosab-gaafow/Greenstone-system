'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import * as productsApi from '../api/products.api';
import type { ProductFilters } from '../types/product.types';
import type { ProductFormValues } from '../schemas/product.schema';

/**
 * Product queries and mutations.
 *
 * Query keys are structured so a mutation can invalidate every product list at
 * once without touching unrelated data.
 */

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productsApi.fetchProducts(filters),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.fetchProduct(id),
  });
}

/** Turns an API error into a message worth showing the user. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProductFormValues) => productsApi.createProduct(values),
    onSuccess: async (product) => {
      // Only product data is invalidated, never the whole cache.
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success(`${product.name} added.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The product could not be added.'));
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ProductFormValues) => productsApi.updateProduct(id, values),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success(`${product.name} saved.`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The changes could not be saved.'));
    },
  });
}

export function useSetProductActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? productsApi.activateProduct(id) : productsApi.deactivateProduct(id),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success(
        product.isActive ? `${product.name} activated.` : `${product.name} deactivated.`,
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'The product status could not be changed.'));
    },
  });
}
