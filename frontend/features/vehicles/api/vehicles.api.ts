import { api, type PaginationMeta } from '@/lib/api-client';
import type { Vehicle, VehicleFilters } from '../types/vehicle.types';
import type { VehicleFormValues } from '../schemas/vehicle.schema';

export interface VehicleListResult {
  vehicles: Vehicle[];
  meta: PaginationMeta;
}

export async function fetchVehicles(filters: VehicleFilters): Promise<VehicleListResult> {
  const { data, meta } = await api.get<Vehicle[]>('/vehicles', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { vehicles: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  const { data } = await api.get<Vehicle>(`/vehicles/${id}`);
  return data;
}

export async function createVehicle(values: VehicleFormValues): Promise<Vehicle> {
  const { data } = await api.post<Vehicle>('/vehicles', values);
  return data;
}

export async function updateVehicle(id: string, values: VehicleFormValues): Promise<Vehicle> {
  const { data } = await api.patch<Vehicle>(`/vehicles/${id}`, values);
  return data;
}

export async function setVehicleActive(id: string, isActive: boolean): Promise<Vehicle> {
  const { data } = await api.post<Vehicle>(`/vehicles/${id}/${isActive ? 'activate' : 'deactivate'}`, {});
  return data;
}
