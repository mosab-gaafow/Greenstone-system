import { api } from '@/lib/api-client';
import type { PaginationMeta } from '@/lib/api-client';
import type { Product, ProductFilters } from '../types/product.types';
import type { ProductFormValues } from '../schemas/product.schema';

/**
 * Product API requests.
 *
 * Every call goes through the central API client, which handles credentials,
 * the CSRF token and session loss.
 */

export interface ProductListResult {
  products: Product[];
  meta: PaginationMeta;
}

export async function fetchProducts(filters: ProductFilters): Promise<ProductListResult> {
  const { data, meta } = await api.get<Product[]>('/products', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      category: filters.category,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { products: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

export async function createProduct(values: ProductFormValues): Promise<Product> {
  const { data } = await api.post<Product>('/products', normalise(values));
  return data;
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  const { data } = await api.patch<Product>(`/products/${id}`, normalise(values));
  return data;
}

export async function activateProduct(id: string): Promise<Product> {
  const { data } = await api.post<Product>(`/products/${id}/activate`, {});
  return data;
}

export async function deactivateProduct(id: string): Promise<Product> {
  const { data } = await api.post<Product>(`/products/${id}/deactivate`, {});
  return data;
}

/**
 * An empty description clears the field, so it is sent as null rather than an
 * empty string. The backend rejects unknown fields, so nothing else is added.
 */
function normalise(values: ProductFormValues) {
  return {
    name: values.name,
    category: values.category,
    size: values.size,
    description: values.description?.trim() ? values.description.trim() : null,
  };
}
