import { api, type PaginationMeta } from '@/lib/api-client';
import type { VehicleOwner, VehicleOwnerFilters } from '../types/vehicle-owner.types';
import type { VehicleOwnerFormValues } from '../schemas/vehicle-owner.schema';

export interface VehicleOwnerListResult {
  vehicleOwners: VehicleOwner[];
  meta: PaginationMeta;
}

export async function fetchVehicleOwners(
  filters: VehicleOwnerFilters,
): Promise<VehicleOwnerListResult> {
  const { data, meta } = await api.get<VehicleOwner[]>('/vehicle-owners', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { vehicleOwners: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchVehicleOwner(id: string): Promise<VehicleOwner> {
  const { data } = await api.get<VehicleOwner>(`/vehicle-owners/${id}`);
  return data;
}

export async function createVehicleOwner(values: VehicleOwnerFormValues): Promise<VehicleOwner> {
  const { data } = await api.post<VehicleOwner>('/vehicle-owners', normalise(values));
  return data;
}

export async function updateVehicleOwner(
  id: string,
  values: VehicleOwnerFormValues,
): Promise<VehicleOwner> {
  const { data } = await api.patch<VehicleOwner>(`/vehicle-owners/${id}`, normalise(values));
  return data;
}

export async function setVehicleOwnerActive(
  id: string,
  isActive: boolean,
): Promise<VehicleOwner> {
  const { data } = await api.post<VehicleOwner>(
    `/vehicle-owners/${id}/${isActive ? 'activate' : 'deactivate'}`,
    {},
  );
  return data;
}

/** An empty national ID clears the field, so it is sent as null. */
function normalise(values: VehicleOwnerFormValues) {
  return {
    name: values.name,
    phone: values.phone,
    nationalId: values.nationalId?.trim() ? values.nationalId.trim() : null,
  };
}
