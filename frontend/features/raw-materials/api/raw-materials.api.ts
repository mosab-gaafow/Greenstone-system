import { api, type PaginationMeta } from '@/lib/api-client';
import type {
  RawMaterial,
  RawMaterialFilters,
  RawMaterialMovement,
  RawMaterialStock,
} from '../types/raw-material.types';
import type {
  AdjustStockFormValues,
  OpeningStockFormValues,
  RawMaterialFormValues,
} from '../schemas/raw-material.schema';

export interface RawMaterialListResult {
  rawMaterials: RawMaterial[];
  meta: PaginationMeta;
}

export async function fetchRawMaterials(filters: RawMaterialFilters): Promise<RawMaterialListResult> {
  const { data, meta } = await api.get<RawMaterial[]>('/raw-materials', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { rawMaterials: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchRawMaterial(id: string): Promise<RawMaterial> {
  const { data } = await api.get<RawMaterial>(`/raw-materials/${id}`);
  return data;
}

export async function createRawMaterial(values: RawMaterialFormValues): Promise<RawMaterial> {
  const { data } = await api.post<RawMaterial>('/raw-materials', normalise(values));
  return data;
}

export async function updateRawMaterial(id: string, values: RawMaterialFormValues): Promise<RawMaterial> {
  const { data } = await api.patch<RawMaterial>(`/raw-materials/${id}`, normalise(values));
  return data;
}

export async function setRawMaterialActive(id: string, isActive: boolean): Promise<RawMaterial> {
  const { data } = await api.post<RawMaterial>(
    `/raw-materials/${id}/${isActive ? 'activate' : 'deactivate'}`,
    {},
  );
  return data;
}

export async function fetchRawMaterialStock(id: string): Promise<RawMaterialStock> {
  const { data } = await api.get<RawMaterialStock>(`/raw-materials/${id}/stock`);
  return data;
}

export interface RawMaterialMovementListResult {
  movements: RawMaterialMovement[];
  meta: PaginationMeta;
}

export async function fetchRawMaterialMovements(
  id: string,
  page: number,
  pageSize: number,
): Promise<RawMaterialMovementListResult> {
  const { data, meta } = await api.get<RawMaterialMovement[]>(`/raw-materials/${id}/stock/movements`, {
    query: { page, pageSize },
  });

  return { movements: data, meta: meta as unknown as PaginationMeta };
}

export async function setOpeningStock(
  id: string,
  values: OpeningStockFormValues,
): Promise<RawMaterialStock> {
  const { data } = await api.post<RawMaterialStock>(`/raw-materials/${id}/stock/opening`, {
    quantity: values.quantity,
    reason: values.reason?.trim() ? values.reason.trim() : undefined,
  });
  return data;
}

export async function adjustStock(id: string, values: AdjustStockFormValues): Promise<RawMaterialStock> {
  const { data } = await api.post<RawMaterialStock>(`/raw-materials/${id}/stock/adjust`, values);
  return data;
}

/** An empty optional field clears the value, so it is sent as null. */
function normalise(values: RawMaterialFormValues) {
  return {
    name: values.name,
    measurementUnitId: values.measurementUnitId,
    reorderLevel: values.reorderLevel?.trim() ? values.reorderLevel.trim() : null,
  };
}
