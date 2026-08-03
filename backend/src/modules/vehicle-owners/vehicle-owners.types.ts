/**
 * Vehicle Owner module types. See business-blueprint section 2.20 and
 * docs/decisions/business-workflow-update-2026-08-02.md sections 10-11.
 *
 * A Vehicle Owner is a separate master-data record from Driver, even when
 * the same real person is both — no automatic link or merge is created
 * between the two (Phase 6F).
 */

export interface VehicleOwnerSummary {
  id: string;
  name: string;
  phone: string;
  /** Optional — nullable, unique when present. */
  nationalId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleOwnerInput {
  name: string;
  phone: string;
  nationalId?: string | null | undefined;
}

export interface UpdateVehicleOwnerInput {
  name?: string | undefined;
  phone?: string | undefined;
  nationalId?: string | null | undefined;
}

export type VehicleOwnerSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListVehicleOwnersFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  sortBy: VehicleOwnerSortField;
  sortDirection: SortDirection;
}

export interface ListVehicleOwnersResult {
  vehicleOwners: VehicleOwnerSummary[];
  totalRecords: number;
}
