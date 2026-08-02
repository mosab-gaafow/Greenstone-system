import type { CreditStatus } from '../../generated/prisma/client.js';

/**
 * Customer credit module types.
 *
 * See business-blueprint sections 2.24 and 2.25, and
 * docs/implementation-plan.md Phase 5B.
 */

export interface CreditStatusResult {
  customerId: string;
  /** Decimal string. */
  openingBalance: string;
  /** Decimal string. Sum of the customer's not-yet-invoiced CREDIT orders. */
  creditOrdersTotal: string;
  /** Decimal string. `openingBalance + creditOrdersTotal`. */
  outstandingBalance: string;
  creditStatus: CreditStatus;
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
  relatedOrderId: string;
  previousCreditStatus: CreditStatus;
  reason: string;
  approvedByUserId: string;
}
