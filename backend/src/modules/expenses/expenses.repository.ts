/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type { ListExpensesFilters } from './expenses.types.js';

export type ExpenseListRow = any;
export type ExpenseDetailRow = any;

function buildWhere(f: ListExpensesFilters): Prisma.ExpenseWhereInput {
  const w: Prisma.ExpenseWhereInput = {};
  if (f.search) w.OR = [{ expenseNumber: { contains: f.search } }, { description: { contains: f.search } }];
  if (f.category) w.category = f.category;
  if (f.paymentMethod) w.paymentMethod = f.paymentMethod;
  return w;
}

export async function findExpenses(f: ListExpensesFilters, c: DbClient = getPrisma()) {
  const where = buildWhere(f);
  const [rows, total] = await Promise.all([
    c.expense.findMany({ where, skip: (f.page - 1) * f.pageSize, take: f.pageSize, orderBy: { [f.sortBy]: f.sortDirection } }),
    c.expense.count({ where }),
  ]);
  return { rows, total };
}

export async function findExpenseById(id: string, c: DbClient = getPrisma()): Promise<ExpenseDetailRow | null> {
  return c.expense.findUnique({
    where: { id },
    include: { evidenceStoredFile: { select: { id: true, storageKey: true, originalFileName: true, mimeType: true, sizeBytes: true, createdAt: true } } },
  });
}

export async function insertExpense(
  tx: TransactionClient,
  input: {
    expenseNumber: string; category: string; description: string; amount: Prisma.Decimal;
    paymentMethod: string; paymentReference?: string | null; expenseDate: Date;
    recordedByUserId: string | null; evidenceStoredFileId?: string | null;
  },
): Promise<ExpenseDetailRow> {
  return tx.expense.create({
    data: {
      expenseNumber: input.expenseNumber, category: input.category as never, description: input.description,
      amount: input.amount, paymentMethod: input.paymentMethod as never,
      paymentReference: input.paymentReference ?? null, expenseDate: input.expenseDate,
      recordedByUserId: input.recordedByUserId, evidenceStoredFileId: input.evidenceStoredFileId ?? null,
    },
    include: { evidenceStoredFile: { select: { id: true, storageKey: true, originalFileName: true, mimeType: true, sizeBytes: true, createdAt: true } } },
  });
}

export async function updateExpense(
  tx: TransactionClient,
  id: string,
  input: {
    category?: string; description?: string; amount?: Prisma.Decimal;
    paymentMethod?: string; paymentReference?: string | null; expenseDate?: Date;
  },
): Promise<ExpenseDetailRow> {
  const data: Record<string, unknown> = {};
  if (input.category !== undefined) data.category = input.category;
  if (input.description !== undefined) data.description = input.description;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod;
  if (input.paymentReference !== undefined) data.paymentReference = input.paymentReference;
  if (input.expenseDate !== undefined) data.expenseDate = input.expenseDate;

  return tx.expense.update({
    where: { id },
    data: data as any,
    include: { evidenceStoredFile: { select: { id: true, storageKey: true, originalFileName: true, mimeType: true, sizeBytes: true, createdAt: true } } },
  });
}
