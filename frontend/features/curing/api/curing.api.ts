import { api, type PaginationMeta } from '@/lib/api-client';
import type { CuringFilters, CuringRecord } from '../types/curing.types';
import type { ChangeCuringDurationFormValues, ReleaseCuringFormValues } from '../schemas/curing.schema';

export interface CuringListResult {
  records: CuringRecord[];
  meta: PaginationMeta;
}

export async function fetchCuringRecords(filters: CuringFilters): Promise<CuringListResult> {
  const { data, meta } = await api.get<CuringRecord[]>('/curing', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      productId: filters.productId,
    },
  });

  return { records: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchCuringRecord(id: string): Promise<CuringRecord> {
  const { data } = await api.get<CuringRecord>(`/curing/${id}`);
  return data;
}

export async function changeCuringDuration(
  id: string,
  values: ChangeCuringDurationFormValues,
): Promise<CuringRecord> {
  const { data } = await api.patch<CuringRecord>(`/curing/${id}/change-duration`, values);
  return data;
}

export async function releaseCuring(id: string, values: ReleaseCuringFormValues): Promise<CuringRecord> {
  const { data } = await api.post<CuringRecord>(`/curing/${id}/release`, values);
  return data;
}
