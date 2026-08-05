import { Prisma, type CreditStatus } from '../../generated/prisma/client.js';
import {
  findOpeningBalance,
  insertCreditOverride,
  sumActiveCreditOrderTotals,
  sumApprovedPaymentAllocations,
  sumIssuedInvoiceTotals,
  upsertOpeningBalance,
  type OpeningBalanceRow,
} from './customer-credit.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import * as customersService from '../customers/customers.service.js';
import type {
  CreateCreditOverrideInput,
  CreditProjectionResult,
  CreditStatusResult,
  OpeningBalanceDetail,
  SetOpeningBalanceInput,
} from './customer-credit.types.js';

/**
 * Customer credit business logic. See business-blueprint sections 2.24 and
 * 2.25, docs/implementation-plan.md Phase 5B/6E, and
 * docs/decisions/business-workflow-update-2026-08-02.md sections 6 and 7.
 *
 * Credit figures are always computed live, from MySQL, never cached and
 * never stored on `Customer` — see docs/technical-blueprint.md section 4A.3.
 *
 * Two distinct calculations (Phase 6E), never conflated:
 *
 * - `computeCreditStatus`/`getCreditStatus` — the accounting outstanding
 *   balance. Orders are never part of it (`openingBalance` alone today,
 *   since Invoices and approved payment allocations do not exist yet).
 *   Used for display and the customer-list balance filter.
 * - `computeProjectedExposure`/`getCreditProjection` — used only to decide
 *   whether a *new* CREDIT order may proceed. Explicitly adds the new
 *   order's own total, unlike the superseded Phase 5B behaviour.
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
 * Computes the accounting outstanding balance (Phase 9D).
 *
 * Formula:
 *   openingBalance + Σ(ISSUED invoices) − Σ(APPROVED payment allocations)
 *
 * PENDING and REVERSED payments are never counted.
 */
export async function computeCreditStatus(
  customerId: string,
  client?: TransactionClient,
): Promise<CreditStatusResult> {
  const [openingBalanceRow, issuedInvoices, approvedPayments] = await Promise.all([
    findOpeningBalance(customerId, client),
    sumIssuedInvoiceTotals(customerId, client),
    sumApprovedPaymentAllocations(customerId, client),
  ]);

  const openingBalance = openingBalanceRow?.amount ?? new Prisma.Decimal(0);
  const outstandingBalance = openingBalance.add(issuedInvoices).sub(approvedPayments);

  return {
    customerId,
    openingBalance: openingBalance.toFixed(2),
    outstandingBalance: outstandingBalance.toFixed(2),
    creditStatus: classify(outstandingBalance),
  };
}

/**
 * Computes the projected exposure for a *new* CREDIT order — the only
 * calculation that decides whether that order may proceed. Confirms the
 * customer exists first, since this backs its own standalone endpoint as
 * well as the order-creation check.
 */
export async function getCreditProjection(
  customerId: string,
  newOrderTotal: string,
): Promise<CreditProjectionResult> {
  await customersService.getCustomer(customerId);

  return computeProjectedExposure(customerId, newOrderTotal);
}

/**
 * Computes the projected exposure without confirming the customer exists —
 * for order creation, which has already loaded and validated the customer.
 */
export async function computeProjectedExposure(
  customerId: string,
  newOrderTotal: string,
  options: { excludeOrderId?: string } = {},
  client?: TransactionClient,
): Promise<CreditProjectionResult> {
  const [accountingStatus, activeCreditOrdersTotal] = await Promise.all([
    computeCreditStatus(customerId, client),
    sumActiveCreditOrderTotals(customerId, options, client),
  ]);

  const currentOutstandingBalance = new Prisma.Decimal(accountingStatus.outstandingBalance);
  const newOrderTotalDecimal = new Prisma.Decimal(newOrderTotal);
  const projectedExposure = currentOutstandingBalance
    .add(activeCreditOrdersTotal)
    .add(newOrderTotalDecimal);

  return {
    customerId,
    currentOutstandingBalance: currentOutstandingBalance.toFixed(2),
    activeCreditOrdersTotal: activeCreditOrdersTotal.toFixed(2),
    newOrderTotal: newOrderTotalDecimal.toFixed(2),
    projectedExposure: projectedExposure.toFixed(2),
    creditStatus: classify(projectedExposure),
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

  // The customer list can now filter by outstanding balance (Phase 6E), so a
  // balance change must invalidate it too — after commit, never before.
  await customersService.invalidateCustomerCache();

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
