/**
 * Measurement unit types.
 *
 * See business-blueprint section 2.13.
 */

export interface MeasurementUnit {
  id: string;
  name: string;
  symbol: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementUnitFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
