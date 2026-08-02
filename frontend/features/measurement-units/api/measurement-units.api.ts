import { api, type PaginationMeta } from '@/lib/api-client';
import type { MeasurementUnit, MeasurementUnitFilters } from '../types/measurement-unit.types';
import type { MeasurementUnitFormValues } from '../schemas/measurement-unit.schema';

export interface MeasurementUnitListResult {
  measurementUnits: MeasurementUnit[];
  meta: PaginationMeta;
}

export async function fetchMeasurementUnits(
  filters: MeasurementUnitFilters,
): Promise<MeasurementUnitListResult> {
  const { data, meta } = await api.get<MeasurementUnit[]>('/measurement-units', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { measurementUnits: data, meta: meta as unknown as PaginationMeta };
}

export async function createMeasurementUnit(
  values: MeasurementUnitFormValues,
): Promise<MeasurementUnit> {
  const { data } = await api.post<MeasurementUnit>('/measurement-units', normalise(values));
  return data;
}

export async function updateMeasurementUnit(
  id: string,
  values: MeasurementUnitFormValues,
): Promise<MeasurementUnit> {
  const { data } = await api.patch<MeasurementUnit>(`/measurement-units/${id}`, normalise(values));
  return data;
}

export async function setMeasurementUnitActive(
  id: string,
  isActive: boolean,
): Promise<MeasurementUnit> {
  const { data } = await api.post<MeasurementUnit>(
    `/measurement-units/${id}/${isActive ? 'activate' : 'deactivate'}`,
    {},
  );
  return data;
}

function normalise(values: MeasurementUnitFormValues) {
  return {
    name: values.name,
    symbol: values.symbol?.trim() ? values.symbol.trim() : null,
  };
}
