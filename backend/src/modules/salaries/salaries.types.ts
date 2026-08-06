import type { PaymentMethod, SalaryFrequency, SalaryStatus } from '../../generated/prisma/client.js';

export interface SalarySummary {
  id: string; salaryNumber: string; employeeId: string; employeeName: string;
  salaryType: SalaryFrequency; periodStart: string; periodEnd: string;
  amount: string; paymentMethod: PaymentMethod; paymentDate: string;
  status: SalaryStatus; hasEvidence: boolean;
  approvedAt: string | null; reversedAt: string | null;
  registeredByUserId: string | null; createdAt: string;
}

export interface EvidenceInfo {
  id: string; originalFileName: string; mimeType: string; sizeBytes: number; createdAt: string;
}

export interface SalaryDetail extends SalarySummary {
  paymentReference: string | null; notes: string | null;
  approvedByUserId: string | null; reversedByUserId: string | null; reversalReason: string | null;
  correctedByUserId: string | null; correctedAt: string | null; correctionReason: string | null;
  evidence: EvidenceInfo | null;
}

export interface CreateSalaryInput {
  employeeId: string; salaryType: SalaryFrequency; periodStart: Date; periodEnd: Date;
  amount: string; paymentMethod: PaymentMethod; paymentReference?: string | null;
  paymentDate: Date; notes?: string | null;
}

export interface EvidenceFileInput { content: Buffer; mimeType: string; originalFileName: string; }

export interface CorrectSalaryInput { amount: string; paymentMethod: PaymentMethod; paymentReference?: string | null; paymentDate: Date; notes?: string | null; reason: string; }

export interface ReverseSalaryInput { reason: string; }

export type SalarySortField = 'salaryNumber' | 'createdAt' | 'paymentDate' | 'amount';
export type SortDirection = 'asc' | 'desc';

export interface ListSalariesFilters {
  page: number; pageSize: number; search?: string;
  status?: SalaryStatus; salaryType?: SalaryFrequency; paymentMethod?: PaymentMethod;
  employeeId?: string; sortBy: SalarySortField; sortDirection: SortDirection;
}

export interface ListSalariesResult { salaries: SalarySummary[]; totalRecords: number; }
