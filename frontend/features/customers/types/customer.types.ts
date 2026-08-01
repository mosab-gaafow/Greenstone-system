/**
 * Customer types.
 *
 * A customer has many building-site addresses, and every address belongs to
 * exactly one customer.
 */

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  directions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  addressCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends Customer {
  addresses: CustomerAddress[];
}

export interface CustomerFilters {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}
