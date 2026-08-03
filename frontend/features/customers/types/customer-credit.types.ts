/**
 * Customer credit types.
 *
 * Mirrors the backend contract. See business-blueprint sections 2.24 and
 * 2.25, and docs/decisions/business-workflow-update-2026-08-02.md sections
 * 6 and 7 (Phase 6E).
 *
 * Two distinct calculations, never conflated: `CreditStatusResult` is the
 * accounting outstanding balance (display, customer-list balance filter);
 * `CreditProjectionResult` is the projected exposure used only to decide
 * whether a *new* CREDIT order may proceed.
 */

export const CREDIT_STATUSES = ['NORMAL', 'WARNING', 'STRONG_WARNING', 'BLOCKED'] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export interface CreditStatusResult {
  customerId: string;
  /** Decimal string. `openingBalance` alone today — Invoices/payments do not exist yet. */
  openingBalance: string;
  /** Decimal string. */
  outstandingBalance: string;
  creditStatus: CreditStatus;
}

export interface CreditProjectionResult {
  customerId: string;
  /** Decimal string. The accounting outstanding balance. */
  currentOutstandingBalance: string;
  /** Decimal string. Sum of this customer's active CREDIT orders not yet invoiced. */
  activeCreditOrdersTotal: string;
  /** Decimal string, as given by the caller. */
  newOrderTotal: string;
  /** Decimal string. `currentOutstandingBalance + activeCreditOrdersTotal + newOrderTotal`. */
  projectedExposure: string;
  creditStatus: CreditStatus;
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

const CREDIT_STATUS_LABELS: Record<CreditStatus, string> = {
  NORMAL: 'Normal',
  WARNING: 'Warning',
  STRONG_WARNING: 'Strong warning',
  BLOCKED: 'Blocked',
};

export function creditStatusLabel(value: CreditStatus): string {
  return CREDIT_STATUS_LABELS[value];
}
