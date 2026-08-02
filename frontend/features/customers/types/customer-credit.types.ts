/**
 * Customer credit types.
 *
 * Mirrors the backend contract. See business-blueprint sections 2.24 and 2.25.
 */

export const CREDIT_STATUSES = ['NORMAL', 'WARNING', 'STRONG_WARNING', 'BLOCKED'] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export interface CreditStatusResult {
  customerId: string;
  /** Decimal string. */
  openingBalance: string;
  /** Decimal string. */
  creditOrdersTotal: string;
  /** Decimal string. */
  outstandingBalance: string;
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
