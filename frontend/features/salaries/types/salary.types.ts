export type SalaryStatus = 'PENDING' | 'APPROVED' | 'REVERSED';
export type SalaryType = 'WEEKLY' | 'MONTHLY';
export type PaymentMethod = 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE';

export interface Salary {
  id: string; salaryNumber: string; employeeId: string; employeeName: string;
  salaryType: SalaryType; periodStart: string; periodEnd: string;
  amount: string; paymentMethod: PaymentMethod; paymentDate: string;
  status: SalaryStatus; hasEvidence: boolean;
  approvedAt: string | null; reversedAt: string | null;
  registeredByUserId: string | null; createdAt: string;
}

export interface SalaryDetail extends Salary {
  paymentReference: string | null; notes: string | null;
  approvedByUserId: string | null; reversedByUserId: string | null; reversalReason: string | null;
  correctedByUserId: string | null; correctedAt: string | null; correctionReason: string | null;
  evidence: { id: string; originalFileName: string; mimeType: string; sizeBytes: number; createdAt: string } | null;
}

export const salaryStatusLabel = (s: SalaryStatus): string => s === 'PENDING' ? 'Pending' : s === 'APPROVED' ? 'Approved' : 'Reversed';
export const salaryTypeLabel = (t: SalaryType): string => t === 'WEEKLY' ? 'Weekly' : 'Monthly';
export const paymentMethodLabel = (m: PaymentMethod): string => {
  const labels: Record<PaymentMethod, string> = { CASH: 'Cash', MPESA: 'M-Pesa', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' };
  return labels[m] ?? m;
};
