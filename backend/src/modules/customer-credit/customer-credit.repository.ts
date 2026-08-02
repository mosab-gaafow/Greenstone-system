import { Prisma, type CustomerOpeningBalance } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { CreateCreditOverrideInput, SetOpeningBalanceInput } from './customer-credit.types.js';

/**
 * Customer credit database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 *
 * `sumCreditOrderTotals` reads the `orders` table directly with a plain
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
 * Sum of the customer's `CREDIT` orders. Every order counts as
 * "not-yet-invoiced" for this interim formula, because Invoices do not exist
 * yet (Phase 9) — see docs/implementation-plan.md Phase 5B.
 */
export async function sumCreditOrderTotals(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const result = await client.order.aggregate({
    where: { customerId, paymentType: 'CREDIT' },
    _sum: { totalAmount: true },
  });

  return result._sum.totalAmount ?? new Prisma.Decimal(0);
}

export async function insertCreditOverride(
  input: CreateCreditOverrideInput,
  client: DbClient = getPrisma(),
): Promise<void> {
  await client.customerCreditOverride.create({
    data: {
      customerId: input.customerId,
      relatedOrderId: input.relatedOrderId,
      previousCreditStatus: input.previousCreditStatus,
      reason: input.reason,
      approvedByUserId: input.approvedByUserId,
    },
  });
}
