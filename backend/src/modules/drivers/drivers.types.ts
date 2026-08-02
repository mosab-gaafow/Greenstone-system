/**
 * Driver module types. See business-blueprint section 2.20.
 */

export interface DriverSummary {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverInput {
  name: string;
  phone: string;
  nationalId: string;
}

export interface UpdateDriverInput {
  name?: string | undefined;
  phone?: string | undefined;
  nationalId?: string | undefined;
}

export type DriverSortField = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface ListDriversFilters {
  page: number;
  pageSize: number;
  search?: string | undefined;
  isActive?: boolean | undefined;
  sortBy: DriverSortField;
  sortDirection: SortDirection;
}

export interface ListDriversResult {
  drivers: DriverSummary[];
  totalRecords: number;
}
