/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '../../generated/prisma/client.js';
import { findSalaries, findSalaryById, findOverlappingSalary, insertSalary, approveSalaryRecord, correctSalaryRecord, reverseSalaryRecord, updateSalaryRecord, type SalaryDetailRow, type SalaryListRow } from './salaries.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { storeFile } from '../../shared/storage/storage.service.js';
import { insertStoredFile } from '../../shared/storage/storage.repository.js';
import { getStorageProvider } from '../../shared/storage/storage.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, InvalidDocumentStatusError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import type { CorrectSalaryInput, CreateSalaryInput, EvidenceFileInput, ListSalariesFilters, ListSalariesResult, ReverseSalaryInput, SalaryDetail, SalarySummary } from './salaries.types.js';

const AUDIT_MODULE = 'salaries';
const EVIDENCE_CATEGORY = 'salary-evidence';

export async function listSalaries(f: ListSalariesFilters): Promise<ListSalariesResult> {
  const { rows, total } = await findSalaries(f);
  return { salaries: rows.map(toSummary), totalRecords: total };
}

export async function getSalary(id: string): Promise<SalaryDetail> {
  return toDetail(await requireSalary(id));
}

export async function createSalary(input: CreateSalaryInput, evidence: EvidenceFileInput | undefined, ctx: RequestContext): Promise<SalaryDetail> {
  // Validate employee
  const employee = await getPrisma().employee.findUnique({ where: { id: input.employeeId }, select: { id: true, name: true, isActive: true } });
  if (!employee) throw new ResourceNotFoundError('That employee was not found.');
  if (!employee.isActive) throw new BusinessRuleViolationError('Cannot register a salary for an inactive employee.');

  let storedEvidence: { storageKey: string; sizeBytes: number; checksum: string } | null = null;
  if (evidence) storedEvidence = await storeFile({ content: evidence.content, mimeType: evidence.mimeType, category: EVIDENCE_CATEGORY, originalFileName: evidence.originalFileName });

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const overlap = await findOverlappingSalary(tx, input.employeeId, input.salaryType, input.periodStart, input.periodEnd);
    if (overlap) throw new BusinessRuleViolationError(`This period overlaps with existing salary ${overlap.salaryNumber}.`);

    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'SALARY_PAYMENT' });

    let evidenceId: string | null = null;
    if (storedEvidence) {
      const sf = await insertStoredFile({ storageKey: storedEvidence.storageKey, originalFileName: evidence!.originalFileName, mimeType: evidence!.mimeType, sizeBytes: storedEvidence.sizeBytes, checksum: storedEvidence.checksum, uploadedByUserId: ctx.user.id, retentionType: 'PERMANENT' }, tx);
      evidenceId = sf.id;
    }

    const salary = await insertSalary(tx, {
      salaryNumber: documentNumber, employeeId: input.employeeId, salaryType: input.salaryType,
      periodStart: input.periodStart, periodEnd: input.periodEnd,
      amount: new Prisma.Decimal(input.amount), paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference ?? null, paymentDate: input.paymentDate,
      notes: input.notes ?? null, registeredByUserId: ctx.user.id, evidenceStoredFileId: evidenceId,
    });

    await recordAudit(tx, { ...toAuditContext(ctx), action: 'REGISTER_SALARY', module: AUDIT_MODULE, entityType: 'Salary', entityId: salary.id, documentNumber, updatedData: { employeeId: input.employeeId, amount: input.amount, salaryType: input.salaryType } });
    return salary;
  });

  return toDetail(created);
}

export async function approveSalary(id: string, ctx: RequestContext): Promise<SalaryDetail> {
  const existing = await requireSalary(id);
  if (existing.status !== 'PENDING') throw new InvalidDocumentStatusError('Only PENDING salaries can be approved.');

  const now = new Date();
  await runInTransaction(async (tx: TransactionClient) => {
    const result = await approveSalaryRecord(tx, id, { approvedByUserId: ctx.user.id, approvedAt: now });
    if (!result) throw new InvalidDocumentStatusError('Salary could not be approved — it may no longer be PENDING.');
    await recordAudit(tx, { ...toAuditContext(ctx), action: 'APPROVE_SALARY', module: AUDIT_MODULE, entityType: 'Salary', entityId: id, documentNumber: existing.salaryNumber, previousData: { status: 'PENDING' }, updatedData: { status: 'APPROVED' } });
  });

  return getSalary(id);
}

export async function editSalary(id: string, input: Record<string, unknown>, ctx: RequestContext): Promise<SalaryDetail> {
  const existing = await requireSalary(id);
  if (existing.status !== 'PENDING') throw new InvalidDocumentStatusError('Only PENDING salaries can be edited.');

  // If periodStart or periodEnd changed, re-check overlaps
  const newStart = (input.periodStart as Date) ?? (existing.periodStart as Date);
  const newEnd = (input.periodEnd as Date) ?? (existing.periodEnd as Date);
  const newType = (input.salaryType as string) ?? (existing.salaryType as string);
  const newEmpId = (input.employeeId as string) ?? (existing.employeeId as string);

  const prev = {
    employeeId: existing.employeeId, salaryType: existing.salaryType,
    periodStart: (existing.periodStart as Date).toISOString(), periodEnd: (existing.periodEnd as Date).toISOString(),
    amount: (existing.amount as Prisma.Decimal).toFixed(2), paymentMethod: existing.paymentMethod,
    paymentDate: (existing.paymentDate as Date).toISOString(),
  };

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    if (input.periodStart !== undefined || input.periodEnd !== undefined || input.salaryType !== undefined || input.employeeId !== undefined) {
      const overlap = await findOverlappingSalary(tx, newEmpId, newType, newStart as Date, newEnd as Date);
      if (overlap && overlap.salaryNumber !== existing.salaryNumber) {
        throw new BusinessRuleViolationError(`This period overlaps with existing salary ${overlap.salaryNumber}.`);
      }
    }

    const result = await updateSalaryRecord(tx, id, input);
    if (!result) throw new InvalidDocumentStatusError('Salary could not be edited — it may no longer be PENDING.');

    await recordAudit(tx, { ...toAuditContext(ctx), action: 'EDIT_SALARY', module: AUDIT_MODULE, entityType: 'Salary', entityId: id, documentNumber: existing.salaryNumber, previousData: prev, updatedData: input });
    return result;
  });

  return toDetail(updated);
}

export async function correctSalary(id: string, input: CorrectSalaryInput, ctx: RequestContext): Promise<SalaryDetail> {
  const existing = await requireSalary(id);
  if (existing.status !== 'PENDING' && existing.status !== 'APPROVED') throw new InvalidDocumentStatusError('Only PENDING or APPROVED salaries can be corrected.');
  const prev = { amount: (existing.amount as Prisma.Decimal).toFixed(2), paymentMethod: existing.paymentMethod, paymentDate: (existing.paymentDate as Date).toISOString() };

  const now = new Date();
  await runInTransaction(async (tx: TransactionClient) => {
    const result = await correctSalaryRecord(tx, id, {
      amount: new Prisma.Decimal(input.amount), paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference ?? null, paymentDate: input.paymentDate,
      notes: input.notes ?? null, correctedByUserId: ctx.user.id, correctedAt: now, correctionReason: input.reason,
    });
    if (!result) throw new InvalidDocumentStatusError('Salary could not be corrected.');
    await recordAudit(tx, { ...toAuditContext(ctx), action: 'CORRECT_SALARY', module: AUDIT_MODULE, entityType: 'Salary', entityId: id, documentNumber: existing.salaryNumber, reason: input.reason, previousData: prev, updatedData: { amount: input.amount, paymentMethod: input.paymentMethod } });
  });

  return getSalary(id);
}

export async function reverseSalary(id: string, input: ReverseSalaryInput, ctx: RequestContext): Promise<SalaryDetail> {
  const existing = await requireSalary(id);
  if (existing.status !== 'APPROVED') throw new InvalidDocumentStatusError('Only APPROVED salaries can be reversed.');

  const now = new Date();
  await runInTransaction(async (tx: TransactionClient) => {
    const result = await reverseSalaryRecord(tx, id, { reversedByUserId: ctx.user.id, reversedAt: now, reversalReason: input.reason });
    if (!result) throw new InvalidDocumentStatusError('Salary could not be reversed — it may no longer be APPROVED.');
    await recordAudit(tx, { ...toAuditContext(ctx), action: 'REVERSE_SALARY', module: AUDIT_MODULE, entityType: 'Salary', entityId: id, documentNumber: existing.salaryNumber, reason: input.reason, previousData: { status: 'APPROVED' }, updatedData: { status: 'REVERSED' } });
  });

  return getSalary(id);
}

export async function getSalaryEvidence(id: string): Promise<{ content: Buffer; mimeType: string; originalFileName: string }> {
  const s = await requireSalary(id);
  const ev = (s as any).evidenceStoredFile as { storageKey: string; mimeType: string; originalFileName: string } | null;
  if (!ev) throw new ResourceNotFoundError('This salary has no evidence.');
  return { content: await getStorageProvider().get(ev.storageKey), mimeType: ev.mimeType, originalFileName: ev.originalFileName };
}

async function requireSalary(id: string): Promise<SalaryDetailRow> {
  const s = await findSalaryById(id); if (!s) throw new ResourceNotFoundError('That salary was not found.'); return s;
}
import { getPrisma } from '../../shared/database/prisma.js';

function toSummary(r: SalaryListRow): SalarySummary {
  return {
    id: r.id, salaryNumber: r.salaryNumber, employeeId: r.employeeId, employeeName: (r as any).employee?.name ?? '',
    salaryType: r.salaryType, periodStart: (r.periodStart as Date).toISOString(), periodEnd: (r.periodEnd as Date).toISOString(),
    amount: (r.amount as Prisma.Decimal).toFixed(2), paymentMethod: r.paymentMethod,
    paymentDate: (r.paymentDate as Date).toISOString(), status: r.status,
    hasEvidence: r.evidenceStoredFileId !== null,
    approvedAt: (r.approvedAt as Date | null)?.toISOString() ?? null,
    reversedAt: (r.reversedAt as Date | null)?.toISOString() ?? null,
    registeredByUserId: r.registeredByUserId as string | null,
    createdAt: (r.createdAt as Date).toISOString(),
  };
}

function toDetail(r: SalaryDetailRow): SalaryDetail {
  return {
    ...toSummary(r as unknown as SalaryListRow),
    paymentReference: r.paymentReference as string | null, notes: r.notes as string | null,
    approvedByUserId: r.approvedByUserId as string | null,
    reversedByUserId: r.reversedByUserId as string | null, reversalReason: r.reversalReason as string | null,
    correctedByUserId: r.correctedByUserId as string | null,
    correctedAt: (r.correctedAt as Date | null)?.toISOString() ?? null,
    correctionReason: r.correctionReason as string | null,
    evidence: (r as any).evidenceStoredFile ? {
      id: (r as any).evidenceStoredFile.id, originalFileName: (r as any).evidenceStoredFile.originalFileName,
      mimeType: (r as any).evidenceStoredFile.mimeType, sizeBytes: (r as any).evidenceStoredFile.sizeBytes as number,
      createdAt: (r as any).evidenceStoredFile.createdAt.toISOString(),
    } : null,
  };
}
