import type { Prisma, Supplier } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import { normalizeEmail, normalizePhone } from '../../shared/utils/normalize.js';
import type { CreateSupplierInput, ListSuppliersFilters, UpdateSupplierInput } from './suppliers.types.js';

/**
 * Supplier database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type SupplierRow = Supplier;

function buildWhere(filters: ListSuppliersFilters): Prisma.SupplierWhereInput {
  const where: Prisma.SupplierWhereInput = {};

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

export async function findSuppliers(
  filters: ListSuppliersFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: SupplierRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.supplier.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.supplier.count({ where }),
  ]);

  return { rows, total };
}

export async function findSupplierById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<SupplierRow | null> {
  return client.supplier.findUnique({ where: { id } });
}

export async function insertSupplier(
  input: CreateSupplierInput,
  client: DbClient = getPrisma(),
): Promise<SupplierRow> {
  return client.supplier.create({
    data: {
      name: input.name,
      phone: input.phone,
      phoneNormalized: normalizePhone(input.phone),
      email: input.email ?? null,
      emailNormalized: input.email ? normalizeEmail(input.email) : null,
      address: input.address ?? null,
    },
  });
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
  client: DbClient = getPrisma(),
): Promise<SupplierRow> {
  const data: Prisma.SupplierUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
    data.phoneNormalized = normalizePhone(input.phone);
  }
  if (input.email !== undefined) {
    data.email = input.email;
    data.emailNormalized = input.email ? normalizeEmail(input.email) : null;
  }
  if (input.address !== undefined) {
    data.address = input.address;
  }

  return client.supplier.update({ where: { id }, data });
}

export async function setSupplierActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<SupplierRow> {
  return client.supplier.update({ where: { id }, data: { isActive } });
}

/** Finds a supplier by normalised phone. The real duplicate check. */
export async function findSupplierByPhone(
  phone: string,
  client: DbClient = getPrisma(),
): Promise<SupplierRow | null> {
  return client.supplier.findUnique({ where: { phoneNormalized: normalizePhone(phone) } });
}

/** Finds a supplier by normalised email. */
export async function findSupplierByEmail(
  email: string,
  client: DbClient = getPrisma(),
): Promise<SupplierRow | null> {
  return client.supplier.findUnique({ where: { emailNormalized: normalizeEmail(email) } });
}
