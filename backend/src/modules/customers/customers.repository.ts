import { Prisma, type Customer, type CustomerAddress } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import {
  normalizeEmail,
  normalizeForComparison,
  normalizePhone,
} from '../../shared/utils/normalize.js';
import type {
  ActiveOrderSummary,
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
  // Independent filter groups are combined with AND, so search and the
  // balance filter never merge into one accidental OR across both.
  const and: Prisma.CustomerWhereInput[] = [];

  if (filters.search) {
    and.push({
      OR: [
        { name: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search } },
      ],
    });
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  // Accounting outstanding balance only (business-blueprint section 2.2/2.24)
  // — never the projected credit-risk exposure. A customer with no
  // `CustomerOpeningBalance` row at all counts as no outstanding balance.
  if (filters.hasOutstandingBalance === true) {
    and.push({ openingBalance: { amount: { gt: 0 } } });
  } else if (filters.hasOutstandingBalance === false) {
    and.push({ OR: [{ openingBalance: null }, { openingBalance: { amount: { lte: 0 } } }] });
  }

  if (and.length > 0) {
    where.AND = and;
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

/**
 * `deactivationReason` is only ever non-null when activating sets it back to
 * null (Phase 6E addendum) — normal deactivation has no reason of its own,
 * only forced deactivation does (`forceDeactivateCustomer` passes one in).
 */
export async function setCustomerActive(
  id: string,
  isActive: boolean,
  deactivationReason: string | null = null,
  client: DbClient = getPrisma(),
): Promise<CustomerRow> {
  return client.customer.update({
    where: { id },
    data: { isActive, deactivationReason: isActive ? null : deactivationReason },
  });
}

/**
 * Orders that are not yet `COMPLETED` or `CANCELLED` — read directly from
 * the `orders` table, the same one-directional pattern
 * `customer-credit.repository.ts` already uses (`orders` may depend on
 * `customers`/`customer-credit`; neither of those ever depends back).
 * Used by the deactivation check (Phase 6E addendum).
 */
export async function findActiveOrdersByCustomerId(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<ActiveOrderSummary[]> {
  return client.order.findMany({
    where: { customerId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    select: { orderNumber: true, status: true },
    orderBy: { orderNumber: 'asc' },
  });
}

/**
 * The accounting outstanding balance's only real input today — the opening
 * balance amount, or `0` when no row exists. Read directly rather than via
 * `customer-credit.service.ts`, to avoid a circular module dependency
 * (`customer-credit` already depends on `customers`, not the other way).
 * Mirrors `customer-credit.repository.ts`'s own `findOpeningBalance`.
 */
export async function findOpeningBalanceAmount(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const row = await client.customerOpeningBalance.findUnique({
    where: { customerId },
    select: { amount: true },
  });

  return row?.amount ?? new Prisma.Decimal(0);
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
