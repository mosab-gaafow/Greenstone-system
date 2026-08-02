/**
 * Driver types. Mirrors the backend contract.
 */

export interface Driver {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
