import { api, type PaginationMeta } from '@/lib/api-client';
import type { Supplier, SupplierFilters } from '../types/supplier.types';
import type { SupplierFormValues } from '../schemas/supplier.schema';

export interface SupplierListResult {
  suppliers: Supplier[];
  meta: PaginationMeta;
}

export async function fetchSuppliers(filters: SupplierFilters): Promise<SupplierListResult> {
  const { data, meta } = await api.get<Supplier[]>('/suppliers', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { suppliers: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  const { data } = await api.get<Supplier>(`/suppliers/${id}`);
  return data;
}

export async function createSupplier(values: SupplierFormValues): Promise<Supplier> {
  const { data } = await api.post<Supplier>('/suppliers', normalise(values));
  return data;
}

export async function updateSupplier(id: string, values: SupplierFormValues): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}`, normalise(values));
  return data;
}

export async function setSupplierActive(id: string, isActive: boolean): Promise<Supplier> {
  const { data } = await api.post<Supplier>(`/suppliers/${id}/${isActive ? 'activate' : 'deactivate'}`, {});
  return data;
}

/** An empty optional field clears the value, so it is sent as null. */
function normalise(values: SupplierFormValues) {
  return {
    name: values.name,
    phone: values.phone,
    email: values.email?.trim() ? values.email.trim() : null,
    address: values.address?.trim() ? values.address.trim() : null,
  };
}
