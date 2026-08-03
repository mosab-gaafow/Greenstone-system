/**
 * Vehicle types. Mirrors the backend contract.
 *
 * Phase 6F removed `ownershipType` and the Phase 4C truck-load calculation
 * fields entirely — every vehicle now has a registered `vehicleOwnerId`
 * instead. See docs/decisions/business-workflow-update-2026-08-02.md
 * sections 10-12.4.
 */

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  vehicleOwnerId: string;
  /** Denormalised for display. */
  vehicleOwnerName: string;
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
