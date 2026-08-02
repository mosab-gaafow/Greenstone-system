import { api, type PaginationMeta } from '@/lib/api-client';
import type { Driver, DriverFilters } from '../types/driver.types';
import type { DriverFormValues } from '../schemas/driver.schema';

export interface DriverListResult {
  drivers: Driver[];
  meta: PaginationMeta;
}

export async function fetchDrivers(filters: DriverFilters): Promise<DriverListResult> {
  const { data, meta } = await api.get<Driver[]>('/drivers', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { drivers: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchDriver(id: string): Promise<Driver> {
  const { data } = await api.get<Driver>(`/drivers/${id}`);
  return data;
}

export async function createDriver(values: DriverFormValues): Promise<Driver> {
  const { data } = await api.post<Driver>('/drivers', values);
  return data;
}

export async function updateDriver(id: string, values: DriverFormValues): Promise<Driver> {
  const { data } = await api.patch<Driver>(`/drivers/${id}`, values);
  return data;
}

export async function setDriverActive(id: string, isActive: boolean): Promise<Driver> {
  const { data } = await api.post<Driver>(`/drivers/${id}/${isActive ? 'activate' : 'deactivate'}`, {});
  return data;
}
