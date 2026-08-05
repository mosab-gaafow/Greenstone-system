import { Prisma, type CustomerOpeningBalance } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { CreateCreditOverrideInput, SetOpeningBalanceInput } from './customer-credit.types.js';

/**
 * Customer credit database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 *
 * `sumActiveCreditOrderTotals` reads the `orders` table directly with a plain
 * aggregate query — not a cross-module service call into `orders` — so credit
 * status computation never depends on the orders module, and `orders` can
 * safely depend on this module the other way for its own credit check
 * without an import cycle.
 */

export type OpeningBalanceRow = CustomerOpeningBalance;

export async function findOpeningBalance(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<OpeningBalanceRow | null> {
  return client.customerOpeningBalance.findUnique({ where: { customerId } });
}

export async function upsertOpeningBalance(
  customerId: string,
  input: SetOpeningBalanceInput,
  enteredByUserId: string | null,
  client: DbClient = getPrisma(),
): Promise<OpeningBalanceRow> {
  return client.customerOpeningBalance.upsert({
    where: { customerId },
    create: {
      customerId,
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

/**
 * Sum of the customer's active `CREDIT` orders not yet invoiced — used only
 * for the projected-exposure check on a *new* credit order (Phase 6E).
 *
 * "Active" excludes `CANCELLED` orders. Every other status counts as
 * "not-yet-invoiced" today, because Invoices do not exist yet (Phase 9) to
 * mark any of them as actually invoiced.
 *
 * `excludeOrderId` lets a caller editing an existing order exclude that
 * order's own total from the sum, so it is never counted twice. Nothing
 * calls this with a real id yet — order editing does not exist — but the
 * parameter exists so a future edit flow does not have to re-derive this
 * rule.
 */
export async function sumActiveCreditOrderTotals(
  customerId: string,
  options: { excludeOrderId?: string } = {},
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const result = await client.order.aggregate({
    where: {
      customerId,
      paymentArrangement: 'CREDIT',
      status: { not: 'CANCELLED' },
      ...(options.excludeOrderId ? { id: { not: options.excludeOrderId } } : {}),
    },
    _sum: { totalAmount: true },
  });

  return result._sum.totalAmount ?? new Prisma.Decimal(0);
}

/**
 * Sum of ISSUED invoice totals for a customer. Phase 9D.
 */
export async function sumIssuedInvoiceTotals(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const result = await client.invoice.aggregate({
    where: { customerId, status: 'ISSUED' },
    _sum: { totalAmount: true },
  });
  return result._sum.totalAmount ?? new Prisma.Decimal(0);
}

/**
 * Sum of APPROVED payment allocations for a customer. Phase 9D.
 * Only allocations whose payment status is APPROVED count.
 */
export async function sumApprovedPaymentAllocations(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const result = await client.customerPaymentAllocation.aggregate({
    where: {
      payment: { customerId, status: 'APPROVED' },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Prisma.Decimal(0);
}

export async function insertCreditOverride(
  input: CreateCreditOverrideInput,
  client: DbClient = getPrisma(),
): Promise<void> {
  await client.customerCreditOverride.create({
    data: {
      customerId: input.customerId,
      relatedOrderId: input.relatedOrderId ?? null,
      relatedDeliveryId: input.relatedDeliveryId ?? null,
      previousCreditStatus: input.previousCreditStatus,
      reason: input.reason,
      approvedByUserId: input.approvedByUserId,
    },
  });
}
