/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type { ListSalariesFilters } from './salaries.types.js';

export type SalaryListRow = any;
export type SalaryDetailRow = any;

function buildWhere(f: ListSalariesFilters): Prisma.SalaryWhereInput {
  const w: Prisma.SalaryWhereInput = {};
  if (f.search) w.OR = [{ salaryNumber: { contains: f.search } }, { employee: { name: { contains: f.search } } }];
  if (f.status) w.status = f.status;
  if (f.salaryType) w.salaryType = f.salaryType;
  if (f.paymentMethod) w.paymentMethod = f.paymentMethod;
  if (f.employeeId) w.employeeId = f.employeeId;
  return w;
}

export async function findSalaries(f: ListSalariesFilters, c: DbClient = getPrisma()) {
  const where = buildWhere(f);
  const [rows, total] = await Promise.all([
    c.salary.findMany({ where, skip: (f.page - 1) * f.pageSize, take: f.pageSize, orderBy: { [f.sortBy]: f.sortDirection }, include: { employee: { select: { name: true } } } }),
    c.salary.count({ where }),
  ]);
  return { rows, total };
}

export async function findSalaryById(id: string, c: DbClient = getPrisma()): Promise<SalaryDetailRow | null> {
  return c.salary.findUnique({
    where: { id },
    include: { employee: { select: { name: true } }, evidenceStoredFile: { select: { id: true, storageKey: true, originalFileName: true, mimeType: true, sizeBytes: true, createdAt: true } } },
  });
}

export async function findOverlappingSalary(tx: TransactionClient, employeeId: string, salaryType: string, periodStart: Date, periodEnd: Date): Promise<{ salaryNumber: string } | null> {
  // Check for overlapping periods: existing start <= new end AND existing end >= new start
  const existing = await tx.salary.findFirst({
    where: {
      employeeId,
      salaryType: salaryType as never,
      status: { in: ['PENDING', 'APPROVED'] },
      periodStart: { lte: periodEnd },
      periodEnd: { gte: periodStart },
    },
    select: { salaryNumber: true },
  });
  return existing;
}

export async function insertSalary(tx: TransactionClient, input: {
  salaryNumber: string; employeeId: string; salaryType: string; periodStart: Date; periodEnd: Date;
  amount: Prisma.Decimal; paymentMethod: string; paymentReference?: string | null; paymentDate: Date;
  notes?: string | null; registeredByUserId: string | null; evidenceStoredFileId?: string | null;
}): Promise<SalaryDetailRow> {
  return tx.salary.create({
    data: {
      salaryNumber: input.salaryNumber, employeeId: input.employeeId, salaryType: input.salaryType as never,
      periodStart: input.periodStart, periodEnd: input.periodEnd, amount: input.amount,
      paymentMethod: input.paymentMethod as never, paymentReference: input.paymentReference ?? null,
      paymentDate: input.paymentDate, notes: input.notes ?? null,
      registeredByUserId: input.registeredByUserId, evidenceStoredFileId: input.evidenceStoredFileId ?? null,
    },
    include: { employee: { select: { name: true } }, evidenceStoredFile: { select: { id: true, storageKey: true, originalFileName: true, mimeType: true, sizeBytes: true, createdAt: true } } },
  });
}

export async function approveSalaryRecord(tx: TransactionClient, id: string, input: { approvedByUserId: string | null; approvedAt: Date }) {
  return tx.salary.update({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', approvedByUserId: input.approvedByUserId, approvedAt: input.approvedAt } });
}

export async function correctSalaryRecord(tx: TransactionClient, id: string, input: {
  amount: Prisma.Decimal; paymentMethod: string; paymentReference?: string | null; paymentDate: Date;
  notes?: string | null; correctedByUserId: string | null; correctedAt: Date; correctionReason: string;
}) {
  return tx.salary.update({
    where: { id, status: { in: ['PENDING', 'APPROVED'] } },
    data: { ...input, paymentMethod: input.paymentMethod as never },
  });
}

export async function reverseSalaryRecord(tx: TransactionClient, id: string, input: { reversedByUserId: string | null; reversedAt: Date; reversalReason: string }) {
  return tx.salary.update({ where: { id, status: 'APPROVED' }, data: { status: 'REVERSED', reversedByUserId: input.reversedByUserId, reversedAt: input.reversedAt, reversalReason: input.reversalReason } });
}

export async function updateSalaryRecord(tx: TransactionClient, id: string, input: Record<string, unknown>) {
  return tx.salary.update({
    where: { id, status: 'PENDING' },
    data: input as any,
    include: { employee: { select: { name: true } }, evidenceStoredFile: { select: { id: true, storageKey: true, originalFileName: true, mimeType: true, sizeBytes: true, createdAt: true } } },
  });
}
