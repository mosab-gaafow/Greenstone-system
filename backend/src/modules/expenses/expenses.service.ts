/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '../../generated/prisma/client.js';
import { findExpenses, findExpenseById, insertExpense, updateExpense, type ExpenseDetailRow, type ExpenseListRow } from './expenses.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { storeFile } from '../../shared/storage/storage.service.js';
import { insertStoredFile } from '../../shared/storage/storage.repository.js';
import { getStorageProvider } from '../../shared/storage/storage.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { ResourceNotFoundError } from '../../shared/errors/app-error.js';
import type { CreateExpenseInput, EvidenceFileInput, ExpenseDetail, ExpenseSummary, ListExpensesFilters, ListExpensesResult, UpdateExpenseInput } from './expenses.types.js';

const AUDIT_MODULE = 'expenses';
const EVIDENCE_CATEGORY = 'expense-evidence';

export async function listExpenses(filters: ListExpensesFilters): Promise<ListExpensesResult> {
  const { rows, total } = await findExpenses(filters);
  return { expenses: rows.map(toSummary), totalRecords: total };
}

export async function getExpense(id: string): Promise<ExpenseDetail> {
  return toDetail(await requireExpense(id));
}

export async function createExpense(input: CreateExpenseInput, evidence: EvidenceFileInput | undefined, context: RequestContext): Promise<ExpenseDetail> {
  // Store evidence before the transaction (storage is not a DB operation).
  let storedEvidence: { storageKey: string; sizeBytes: number; checksum: string } | null = null;
  if (evidence) {
    storedEvidence = await storeFile({ content: evidence.content, mimeType: evidence.mimeType, category: EVIDENCE_CATEGORY, originalFileName: evidence.originalFileName });
  }

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'EXPENSE' });

    let evidenceStoredFileId: string | null = null;
    if (storedEvidence) {
      const sf = await insertStoredFile({
        storageKey: storedEvidence.storageKey, originalFileName: evidence!.originalFileName,
        mimeType: evidence!.mimeType, sizeBytes: storedEvidence.sizeBytes,
        checksum: storedEvidence.checksum, uploadedByUserId: context.user.id,
        retentionType: 'PERMANENT',
      }, tx);
      evidenceStoredFileId = sf.id;
    }

    const expense = await insertExpense(tx, {
      expenseNumber: documentNumber, category: input.category, description: input.description,
      amount: new Prisma.Decimal(input.amount), paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference ?? null, expenseDate: input.expenseDate,
      recordedByUserId: context.user.id, evidenceStoredFileId,
    });

    await recordAudit(tx, {
      ...toAuditContext(context), action: 'CREATE_EXPENSE', module: AUDIT_MODULE,
      entityType: 'Expense', entityId: expense.id, documentNumber,
      updatedData: { expenseNumber: documentNumber, category: input.category, amount: input.amount, expenseDate: input.expenseDate.toISOString(), hasEvidence: !!evidenceStoredFileId },
    });

    return expense;
  });

  return toDetail(created);
}

export async function editExpense(id: string, input: UpdateExpenseInput, context: RequestContext): Promise<ExpenseDetail> {
  const existing = await requireExpense(id);

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    const data: Record<string, unknown> = {};
    if (input.category !== undefined) data.category = input.category;
    if (input.description !== undefined) data.description = input.description;
    if (input.amount !== undefined) data.amount = new Prisma.Decimal(input.amount);
    if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod;
    if (input.paymentReference !== undefined) data.paymentReference = input.paymentReference ?? null;
    if (input.expenseDate !== undefined) data.expenseDate = input.expenseDate;

    const expense = await updateExpense(tx, id, data as any);

    await recordAudit(tx, {
      ...toAuditContext(context), action: 'UPDATE_EXPENSE', module: AUDIT_MODULE,
      entityType: 'Expense', entityId: id, documentNumber: existing.expenseNumber,
      previousData: {
        category: existing.category, description: existing.description,
        amount: (existing.amount as Prisma.Decimal).toFixed(2),
        paymentMethod: existing.paymentMethod, paymentReference: existing.paymentReference,
        expenseDate: (existing.expenseDate as Date).toISOString(),
      },
      updatedData: {
        category: expense.category, description: expense.description,
        amount: (expense.amount as Prisma.Decimal).toFixed(2),
        paymentMethod: expense.paymentMethod, paymentReference: expense.paymentReference,
        expenseDate: (expense.expenseDate as Date).toISOString(),
      },
    });

    return expense;
  });

  return toDetail(updated);
}

export async function getExpenseEvidence(id: string): Promise<{ content: Buffer; mimeType: string; originalFileName: string }> {
  const expense = await requireExpense(id);
  const evidence = (expense as any).evidenceStoredFile as { storageKey: string; mimeType: string; originalFileName: string } | null;
  if (!evidence) throw new ResourceNotFoundError('This expense has no uploaded evidence.');
  const content = await getStorageProvider().get(evidence.storageKey);
  return { content, mimeType: evidence.mimeType, originalFileName: evidence.originalFileName };
}

async function requireExpense(id: string): Promise<ExpenseDetailRow> {
  const e = await findExpenseById(id);
  if (!e) throw new ResourceNotFoundError('That expense was not found.');
  return e;
}

function toSummary(row: ExpenseListRow): ExpenseSummary {
  return {
    id: row.id, expenseNumber: row.expenseNumber, category: row.category,
    description: row.description, amount: (row.amount as Prisma.Decimal).toFixed(2),
    paymentMethod: row.paymentMethod, paymentReference: row.paymentReference as string | null,
    expenseDate: (row.expenseDate as Date).toISOString(),
    hasEvidence: row.evidenceStoredFileId !== null,
    recordedByUserId: row.recordedByUserId as string | null,
    createdAt: (row.createdAt as Date).toISOString(),
  };
}

function toDetail(row: ExpenseDetailRow): ExpenseDetail {
  return {
    ...toSummary(row as unknown as ExpenseListRow),
    evidence: (row as any).evidenceStoredFile ? {
      id: (row as any).evidenceStoredFile.id,
      originalFileName: (row as any).evidenceStoredFile.originalFileName,
      mimeType: (row as any).evidenceStoredFile.mimeType,
      sizeBytes: (row as any).evidenceStoredFile.sizeBytes as number,
      createdAt: (row as any).evidenceStoredFile.createdAt.toISOString(),
    } : null,
  };
}
