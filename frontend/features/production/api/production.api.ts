import { api, type PaginationMeta } from '@/lib/api-client';
import type { Production, ProductionDetail, ProductionFilters } from '../types/production.types';
import type { ProductionFormValues } from '../schemas/production.schema';

export interface ProductionListResult {
  batches: Production[];
  meta: PaginationMeta;
}

export async function fetchProductionBatches(
  filters: ProductionFilters,
): Promise<ProductionListResult> {
  const { data, meta } = await api.get<Production[]>('/production', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      purpose: filters.purpose,
      status: filters.status,
    },
  });

  return { batches: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchProductionBatch(id: string): Promise<ProductionDetail> {
  const { data } = await api.get<ProductionDetail>(`/production/${id}`);
  return data;
}

export async function createProductionBatch(values: ProductionFormValues): Promise<ProductionDetail> {
  const { data } = await api.post<ProductionDetail>('/production', {
    productionDate: values.productionDate,
    purpose: values.purpose,
    orderId: values.purpose === 'ORDER' ? values.orderId : undefined,
    items: values.items,
    rawMaterialUsages: values.rawMaterialUsages,
  });
  return data;
}
