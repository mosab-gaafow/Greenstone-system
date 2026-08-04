import type { CreditStatus } from '../../generated/prisma/client.js';

/**
 * Customer credit module types.
 *
 * See business-blueprint sections 2.24 and 2.25,
 * docs/implementation-plan.md Phase 5B/6E, and
 * docs/decisions/business-workflow-update-2026-08-02.md sections 6 and 7.
 *
 * Two distinct calculations, never conflated:
 *
 * - `CreditStatusResult` — the accounting outstanding balance
 *   (`openingBalance + issued invoices − approved payment allocations`).
 *   Orders are never part of it. Used for display and the customer-list
 *   balance filter.
 * - `CreditProjectionResult` — the projected exposure used only to decide
 *   whether a *new* CREDIT order may proceed
 *   (`current outstanding balance + active CREDIT orders not yet invoiced +
 *   the new order's own total`).
 */

export interface CreditStatusResult {
  customerId: string;
  /** Decimal string. */
  openingBalance: string;
  /**
   * Decimal string. `openingBalance` alone today — Invoices and approved
   * payment allocations do not exist yet (Phase 9). Once they do, this
   * becomes `openingBalance + issuedInvoicesTotal −
   * approvedPaymentAllocationsTotal`.
   */
  outstandingBalance: string;
  creditStatus: CreditStatus;
}

export interface CreditProjectionResult {
  customerId: string;
  /** Decimal string. The accounting outstanding balance (see above). */
  currentOutstandingBalance: string;
  /**
   * Decimal string. Sum of this customer's active (not `CANCELLED`) CREDIT
   * orders not yet invoiced. Every non-cancelled order counts today, since
   * Invoices do not exist yet to mark any of them as invoiced.
   */
  activeCreditOrdersTotal: string;
  /** Decimal string, as given by the caller. */
  newOrderTotal: string;
  /** Decimal string. `currentOutstandingBalance + activeCreditOrdersTotal + newOrderTotal`. */
  projectedExposure: string;
  creditStatus: CreditStatus;
}

export interface GetCreditProjectionQuery {
  /** Decimal string, never a JavaScript number. */
  newOrderTotal: string;
}

export interface SetOpeningBalanceInput {
  /** Decimal string, never a JavaScript number. */
  amount: string;
  effectiveDate: Date;
  reason: string;
}

export interface OpeningBalanceDetail {
  customerId: string;
  amount: string;
  effectiveDate: string;
  reason: string;
  enteredByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreditOverrideInput {
  customerId: string;
  /** Nullable since Phase 8A — override may attach to a Delivery instead. */
  relatedOrderId?: string | null | undefined;
  /** Added Phase 8A — the Delivery this override was created for. */
  relatedDeliveryId?: string | null | undefined;
  previousCreditStatus: CreditStatus;
  reason: string;
  approvedByUserId: string;
}
