/**
 * Vehicle types. Mirrors the backend contract, including the truck-load
 * calculation snapshot fields.
 *
 * Hired-only for the MVP: `ownershipType` is informational only (always
 * "HIRED") — there is no ownership choice in the create/edit form, and
 * `hireCost` does not exist on the Vehicle master at all. See
 * docs/implementation-plan.md Phase 4C.
 */

export type OwnershipType = 'COMPANY' | 'HIRED';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  ownershipType: OwnershipType;
  /** Decimal strings, never floats. Always present — every vehicle requires dimensions. */
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

export interface VehicleFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
