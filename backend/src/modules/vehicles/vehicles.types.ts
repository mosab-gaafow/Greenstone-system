import type { VehicleOwnershipType } from '../../generated/prisma/client.js';

/**
 * Vehicle module types. See business-blueprint section 2.20 and
 * docs/implementation-plan.md Phase 4C for the truck-load calculation.
 *
 * Hired-only for the MVP: `ownershipType` is never accepted from a request —
 * every vehicle is created as HIRED. The column and enum stay so COMPANY
 * support needs no schema change later.
 *
 * There is deliberately no hire-cost field. A vehicle does not have one
 * permanent hire cost; actual transport cost varies per delivery trip and
 * belongs to a later Delivery/Expense/transport-payment workflow.
 */

export interface VehicleSummary {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  ownershipType: VehicleOwnershipType;
  /** Decimal strings, never floats. */
  truckLengthM: string;
  truckWidthM: string;
  truckHeightM: string;
  calculationFactor: string;
  calculatedLoadKg: string;
  calculatedLoadTonnes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleInput {
  registrationNumber: string;
  vehicleType: string;
  truckLengthM: string;
  truckWidthM: string;
  truckHeightM: string;
}

export interface UpdateVehicleInput {
  registrationNumber?: string | undefined;
  vehicleType?: string | undefined;
  truckLengthM?: string | undefined;
  truckWidthM?: string | undefined;
  truckHeightM?: string | undefined;
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
