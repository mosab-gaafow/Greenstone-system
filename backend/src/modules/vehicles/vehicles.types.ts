/**
 * Vehicle module types. See business-blueprint section 2.20 and
 * docs/decisions/business-workflow-update-2026-08-02.md sections 10-12.4.
 *
 * Phase 6F removed `ownershipType` and the Phase 4C volumetric truck-load
 * fields entirely — every vehicle now has a registered `vehicleOwnerId`
 * instead. There is deliberately no transport-rate or hire-cost field; a
 * vehicle does not have one permanent price (Delivery/transport-payment,
 * not implemented here).
 */

export interface VehicleSummary {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  vehicleOwnerId: string;
  /** Denormalised for list display — avoids a second lookup per row. */
  vehicleOwnerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleInput {
  registrationNumber: string;
  vehicleType: string;
  vehicleOwnerId: string;
}

export interface UpdateVehicleInput {
  registrationNumber?: string | undefined;
  vehicleType?: string | undefined;
  vehicleOwnerId?: string | undefined;
}

export type VehicleSortField = 'registrationNumber' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListVehiclesFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  sortBy: VehicleSortField;
  sortDirection: SortDirection;
}

export interface ListVehiclesResult {
  vehicles: VehicleSummary[];
  totalRecords: number;
}
