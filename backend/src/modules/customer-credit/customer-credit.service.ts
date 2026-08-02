import { Prisma, type CreditStatus } from '../../generated/prisma/client.js';
import {
  findOpeningBalance,
  insertCreditOverride,
  sumCreditOrderTotals,
  upsertOpeningBalance,
  type OpeningBalanceRow,
} from './customer-credit.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import * as customersService from '../customers/customers.service.js';
import type {
  CreateCreditOverrideInput,
  CreditStatusResult,
  OpeningBalanceDetail,
  SetOpeningBalanceInput,
} from './customer-credit.types.js';

/**
 * Customer credit business logic. See business-blueprint sections 2.24 and
 * 2.25, and docs/implementation-plan.md Phase 5B.
 *
 * Credit status is always computed live, from MySQL, never cached and never
 * stored on `Customer` — see docs/technical-blueprint.md section 4A.3.
 *
 * Interim outstanding-balance formula, until Invoices exist (Phase 9):
 * `opening balance + the customer's CREDIT orders`. This switches to
 * `opening balance + issued invoices − approved payments` once Invoices
 * ship, and this module's comment on that trade-off is removed then.
 */

const AUDIT_MODULE = 'customer-credit';

/** Business-blueprint section 2.24. The confirmed credit limit is KES 1,000,000. */
const WARNING_THRESHOLD = new Prisma.Decimal(800_000);
const STRONG_WARNING_THRESHOLD = new Prisma.Decimal(900_000);
const BLOCKED_THRESHOLD = new Prisma.Decimal(1_000_000);

export async function getCreditStatus(customerId: string): Promise<CreditStatusResult> {
  await customersService.getCustomer(customerId);

  return computeCreditStatus(customerId);
}

/**
 * Computes credit status without confirming the customer exists — for callers
 * (such as order creation) that have already loaded the customer and want to
 * read within their own transaction.
 */
export async function computeCreditStatus(
  customerId: string,
  client?: TransactionClient,
): Promise<CreditStatusResult> {
  const [openingBalanceRow, creditOrdersTotal] = await Promise.all([
    findOpeningBalance(customerId, client),
    sumCreditOrderTotals(customerId, client),
  ]);

  const openingBalance = openingBalanceRow?.amount ?? new Prisma.Decimal(0);
  const outstandingBalance = openingBalance.add(creditOrdersTotal);

  return {
    customerId,
    openingBalance: openingBalance.toFixed(2),
    creditOrdersTotal: creditOrdersTotal.toFixed(2),
    outstandingBalance: outstandingBalance.toFixed(2),
    creditStatus: classify(outstandingBalance),
  };
}

export async function setOpeningBalance(
  customerId: string,
  input: SetOpeningBalanceInput,
  context: RequestContext,
): Promise<OpeningBalanceDetail> {
  await customersService.getCustomer(customerId);
  const existing = await findOpeningBalance(customerId);

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const balance = await upsertOpeningBalance(customerId, input, context.user.id, tx);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'SET_CUSTOMER_OPENING_BALANCE',
      module: AUDIT_MODULE,
      entityType: 'CustomerOpeningBalance',
      entityId: balance.id,
      reason: input.reason,
      previousData: existing ? toAuditSnapshot(existing) : null,
      updatedData: toAuditSnapshot(balance),
    });

    return balance;
  });

  return toDetail(updated);
}

/**
 * Records a credit override inside the caller's existing transaction. Used by
 * `orders.service.ts` when an Admin/Super Admin overrides a BLOCKED
 * customer's credit check for a new credit order — see business-blueprint
 * section 2.24.
 */
export async function recordCreditOverride(
  tx: TransactionClient,
  input: CreateCreditOverrideInput,
): Promise<void> {
  await insertCreditOverride(input, tx);
}

function classify(outstandingBalance: Prisma.Decimal): CreditStatus {
  if (outstandingBalance.gte(BLOCKED_THRESHOLD)) {
    return 'BLOCKED';
  }
  if (outstandingBalance.gte(STRONG_WARNING_THRESHOLD)) {
    return 'STRONG_WARNING';
  }
  if (outstandingBalance.gte(WARNING_THRESHOLD)) {
    return 'WARNING';
  }
  return 'NORMAL';
}

function toDetail(row: OpeningBalanceRow): OpeningBalanceDetail {
  return {
    customerId: row.customerId,
    amount: row.amount.toFixed(2),
    effectiveDate: row.effectiveDate.toISOString(),
    reason: row.reason,
    enteredByUserId: row.enteredByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAuditSnapshot(row: OpeningBalanceRow): Record<string, unknown> {
  return {
    amount: row.amount.toFixed(2),
    effectiveDate: row.effectiveDate.toISOString(),
    reason: row.reason,
  };
}
