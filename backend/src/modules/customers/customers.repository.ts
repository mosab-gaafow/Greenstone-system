import type { Customer, CustomerAddress, Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import {
  normalizeEmail,
  normalizeForComparison,
  normalizePhone,
} from '../../shared/utils/normalize.js';
import type {
  CreateAddressInput,
  CreateCustomerInput,
  ListCustomersFilters,
  UpdateAddressInput,
  UpdateCustomerInput,
} from './customers.types.js';

/**
 * Customer and address database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type CustomerRow = Customer;
export type AddressRow = CustomerAddress;
export type CustomerWithAddresses = Customer & { addresses: CustomerAddress[] };

function buildWhere(filters: ListCustomersFilters): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { phone: { contains: filters.search } },
      { email: { contains: filters.search } },
    ];
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findCustomers(
  filters: ListCustomersFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: (CustomerRow & { _count: { addresses: number } })[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.customer.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      // Counting only active addresses keeps the list figure meaningful — a
      // retired site should not inflate it.
      include: { _count: { select: { addresses: { where: { isActive: true } } } } },
    }),
    client.customer.count({ where }),
  ]);

  return { rows, total };
}

export async function findCustomerById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<CustomerWithAddresses | null> {
  return client.customer.findUnique({
    where: { id },
    include: { addresses: { orderBy: [{ isActive: 'desc' }, { label: 'asc' }] } },
  });
}

export async function insertCustomer(
  input: CreateCustomerInput,
  client: DbClient = getPrisma(),
): Promise<CustomerRow> {
  return client.customer.create({
    data: {
      name: input.name,
      phone: input.phone,
      phoneNormalized: normalizePhone(input.phone),
      email: input.email ?? null,
      emailNormalized: input.email ? normalizeEmail(input.email) : null,
    },
  });
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  client: DbClient = getPrisma(),
): Promise<CustomerRow> {
  const data: Prisma.CustomerUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
    // Kept in step with the raw value, or the unique index would guard a stale
    // one and duplicates could slip back in.
    data.phoneNormalized = normalizePhone(input.phone);
  }
  if (input.email !== undefined) {
    data.email = input.email;
    data.emailNormalized = input.email ? normalizeEmail(input.email) : null;
  }

  return client.customer.update({ where: { id }, data });
}

export async function setCustomerActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<CustomerRow> {
  return client.customer.update({ where: { id }, data: { isActive } });
}

/** Finds a customer by normalised phone. The real duplicate check. */
export async function findCustomerByPhone(
  phone: string,
  client: DbClient = getPrisma(),
): Promise<CustomerRow | null> {
  return client.customer.findUnique({ where: { phoneNormalized: normalizePhone(phone) } });
}

/** Finds a customer by normalised email. */
export async function findCustomerByEmail(
  email: string,
  client: DbClient = getPrisma(),
): Promise<CustomerRow | null> {
  return client.customer.findUnique({ where: { emailNormalized: normalizeEmail(email) } });
}

export async function findAddressById(
  addressId: string,
  client: DbClient = getPrisma(),
): Promise<AddressRow | null> {
  return client.customerAddress.findUnique({ where: { id: addressId } });
}

export async function findAddressByLabel(
  customerId: string,
  label: string,
  client: DbClient = getPrisma(),
): Promise<AddressRow | null> {
  return client.customerAddress.findUnique({
    where: {
      customerId_labelNormalized: {
        customerId,
        labelNormalized: normalizeForComparison(label),
      },
    },
  });
}

export async function insertAddress(
  customerId: string,
  input: CreateAddressInput,
  client: DbClient = getPrisma(),
): Promise<AddressRow> {
  return client.customerAddress.create({
    data: {
      customerId,
      label: input.label,
      labelNormalized: normalizeForComparison(input.label),
      addressLine: input.addressLine,
      directions: input.directions ?? null,
    },
  });
}

export async function updateAddress(
  addressId: string,
  input: UpdateAddressInput,
  client: DbClient = getPrisma(),
): Promise<AddressRow> {
  const data: Prisma.CustomerAddressUpdateInput = {};

  if (input.label !== undefined) {
    data.label = input.label;
    data.labelNormalized = normalizeForComparison(input.label);
  }
  if (input.addressLine !== undefined) {
    data.addressLine = input.addressLine;
  }
  if (input.directions !== undefined) {
    data.directions = input.directions;
  }

  return client.customerAddress.update({ where: { id: addressId }, data });
}

export async function setAddressActive(
  addressId: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<AddressRow> {
  return client.customerAddress.update({ where: { id: addressId }, data: { isActive } });
}
