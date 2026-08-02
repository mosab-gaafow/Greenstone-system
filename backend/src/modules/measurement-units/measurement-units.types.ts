/**
 * Measurement unit module types.
 *
 * See business-blueprint section 2.13.
 */

export interface MeasurementUnitSummary {
  id: string;
  name: string;
  symbol: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeasurementUnitInput {
  name: string;
  symbol?: string | null | undefined;
}

export interface UpdateMeasurementUnitInput {
  name?: string | undefined;
  symbol?: string | null | undefined;
}

export type MeasurementUnitSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListMeasurementUnitsFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  sortBy: MeasurementUnitSortField;
  sortDirection: SortDirection;
}

export interface ListMeasurementUnitsResult {
  measurementUnits: MeasurementUnitSummary[];
  totalRecords: number;
}
