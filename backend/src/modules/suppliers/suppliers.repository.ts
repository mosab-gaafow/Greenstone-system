import { Prisma, type Supplier, type SupplierOpeningBalance } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import { normalizeEmail, normalizePhone } from '../../shared/utils/normalize.js';
import type {
  CreateSupplierInput,
  ListSuppliersFilters,
  SetSupplierOpeningBalanceInput,
  UpdateSupplierInput,
} from './suppliers.types.js';

/**
 * Supplier database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type SupplierRow = Supplier;
export type SupplierOpeningBalanceRow = SupplierOpeningBalance;

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

export async function findSupplierOpeningBalance(
  supplierId: string,
  client: DbClient = getPrisma(),
): Promise<SupplierOpeningBalanceRow | null> {
  return client.supplierOpeningBalance.findUnique({ where: { supplierId } });
}

/**
 * Corrects the supplier's opening balance in place — one row per supplier,
 * the same shape as `customer-credit.repository.ts`'s `upsertOpeningBalance`.
 */
/**
 * Sum of every Purchase's `totalCost` for this supplier. See
 * `customer-credit.repository.ts`'s `sumActiveCreditOrderTotals` — the same
 * "read the other module's table directly with a plain aggregate query, not
 * a cross-module service call" pattern, so this module never has to depend
 * on `purchases` (which depends on `suppliers` the other way, to validate
 * the supplier exists and is active).
 *
 * "Eligible unpaid" (business-blueprint section 2.17) reduces to "every
 * purchase" today: a Purchase carries no paid/partial status of its own —
 * that will live entirely on Purchase Payment (Phase 7D) — so until then
 * every purchase counts, the same interim reasoning Phase 5B/6E already
 * applied to uninvoiced customer orders.
 */
export async function sumPurchaseTotals(
  supplierId: string,
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const result = await client.purchase.aggregate({
    where: { supplierId },
    _sum: { totalCost: true },
  });

  return result._sum.totalCost ?? new Prisma.Decimal(0);
}

/**
 * Sum of every `APPROVED` PurchasePayment's `amount` for this supplier
 * (Phase 7D). `PENDING` and `REVERSED` payments are excluded — see
 * business-blueprint section 2.17 ("reversed payments must not reduce the
 * balance") and `purchase-payments.service.ts` for the full lifecycle. Same
 * direct-table-query pattern as `sumPurchaseTotals`, so this module never
 * depends on `purchase-payments` (which depends on `suppliers` the other way).
 */
export async function sumApprovedPurchasePaymentTotals(
  supplierId: string,
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const result = await client.purchasePayment.aggregate({
    where: { supplierId, status: 'APPROVED' },
    _sum: { amount: true },
  });

  return result._sum.amount ?? new Prisma.Decimal(0);
}

export async function upsertSupplierOpeningBalance(
  supplierId: string,
  input: SetSupplierOpeningBalanceInput,
  enteredByUserId: string | null,
  client: DbClient = getPrisma(),
): Promise<SupplierOpeningBalanceRow> {
  return client.supplierOpeningBalance.upsert({
    where: { supplierId },
    create: {
      supplierId,
      amount: new Prisma.Decimal(input.amount),
      effectiveDate: input.effectiveDate,
      reason: input.reason,
      enteredByUserId,
    },
    update: {
      amount: new Prisma.Decimal(input.amount),
      effectiveDate: input.effectiveDate,
      reason: input.reason,
      enteredByUserId,
    },
  });
}
