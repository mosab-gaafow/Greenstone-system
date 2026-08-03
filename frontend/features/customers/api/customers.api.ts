import { api, type PaginationMeta } from '@/lib/api-client';
import type { Customer, CustomerDetail, CustomerFilters } from '../types/customer.types';
import type { AddressFormValues, CustomerFormValues } from '../schemas/customer.schema';

/**
 * Customer API requests.
 *
 * Address calls are nested under their customer, which keeps the ownership rule
 * visible: an address is always reached through the customer it belongs to.
 */

export interface CustomerListResult {
  customers: Customer[];
  meta: PaginationMeta;
}

export async function fetchCustomers(filters: CustomerFilters): Promise<CustomerListResult> {
  const { data, meta } = await api.get<Customer[]>('/customers', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
      hasOutstandingBalance:
        filters.hasOutstandingBalance === undefined
          ? undefined
          : String(filters.hasOutstandingBalance),
    },
  });

  return { customers: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchCustomer(id: string): Promise<CustomerDetail> {
  const { data } = await api.get<CustomerDetail>(`/customers/${id}`);
  return data;
}

export async function createCustomer(values: CustomerFormValues): Promise<CustomerDetail> {
  const { data } = await api.post<CustomerDetail>('/customers', normaliseCustomer(values));
  return data;
}

export async function updateCustomer(
  id: string,
  values: CustomerFormValues,
): Promise<CustomerDetail> {
  const { data } = await api.patch<CustomerDetail>(`/customers/${id}`, normaliseCustomer(values));
  return data;
}

export async function setCustomerActive(id: string, isActive: boolean): Promise<CustomerDetail> {
  const { data } = await api.post<CustomerDetail>(
    `/customers/${id}/${isActive ? 'activate' : 'deactivate'}`,
    {},
  );
  return data;
}

/** Bypasses the normal deactivation safeguards for an exceptional reason (Phase 6E addendum). */
export async function forceDeactivateCustomer(
  id: string,
  reason: string,
): Promise<CustomerDetail> {
  const { data } = await api.post<CustomerDetail>(`/customers/${id}/force-deactivate`, { reason });
  return data;
}

export async function createAddress(
  customerId: string,
  values: AddressFormValues,
): Promise<CustomerDetail> {
  const { data } = await api.post<CustomerDetail>(
    `/customers/${customerId}/addresses`,
    normaliseAddress(values),
  );
  return data;
}

export async function updateAddress(
  customerId: string,
  addressId: string,
  values: AddressFormValues,
): Promise<CustomerDetail> {
  const { data } = await api.patch<CustomerDetail>(
    `/customers/${customerId}/addresses/${addressId}`,
    normaliseAddress(values),
  );
  return data;
}

export async function setAddressActive(
  customerId: string,
  addressId: string,
  isActive: boolean,
): Promise<CustomerDetail> {
  const { data } = await api.post<CustomerDetail>(
    `/customers/${customerId}/addresses/${addressId}/${isActive ? 'activate' : 'deactivate'}`,
    {},
  );
  return data;
}

/** An empty optional field clears the value, so it is sent as null. */
function normaliseCustomer(values: CustomerFormValues) {
  return {
    name: values.name,
    phone: values.phone,
    email: values.email?.trim() ? values.email.trim() : null,
  };
}

function normaliseAddress(values: AddressFormValues) {
  return {
    label: values.label,
    addressLine: values.addressLine,
    directions: values.directions?.trim() ? values.directions.trim() : null,
  };
}
