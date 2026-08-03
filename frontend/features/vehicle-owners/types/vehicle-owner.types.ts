/**
 * Vehicle Owner types. Mirrors the backend contract.
 */

export interface VehicleOwner {
  id: string;
  name: string;
  phone: string;
  /** Optional. */
  nationalId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleOwnerFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
