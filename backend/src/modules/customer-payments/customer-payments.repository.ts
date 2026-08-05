/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, type CustomerPayment } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type { ListPaymentsFilters } from './customer-payments.types.js';

 
export type PaymentRow = any;
 
export type PaymentDetailRow = any;

function buildWhere(f: ListPaymentsFilters): Prisma.CustomerPaymentWhereInput {
  const w: Prisma.CustomerPaymentWhereInput = {};
  if (f.search) w.OR = [{ paymentNumber: { contains: f.search } }, { customer: { name: { contains: f.search } } }];
  if (f.status) w.status = f.status;
  if (f.customerId) w.customerId = f.customerId;
  if (f.paymentMethod) w.paymentMethod = f.paymentMethod;
  return w;
}

export async function findPayments(f: ListPaymentsFilters, c: DbClient = getPrisma()) {
  const where = buildWhere(f);
  const [rows, total] = await Promise.all([
    c.customerPayment.findMany({ where, skip: (f.page - 1) * f.pageSize, take: f.pageSize, orderBy: { [f.sortBy]: f.sortDirection }, include: { customer: { select: { name: true } }, _count: { select: { allocations: true } } } }),
    c.customerPayment.count({ where }),
  ]);
  return { rows, total };
}

export async function findPaymentById(id: string, c: DbClient = getPrisma()): Promise<PaymentDetailRow | null> {
  return c.customerPayment.findUnique({ where: { id }, include: { customer: { select: { name: true } }, allocations: { include: { invoice: { select: { invoiceNumber: true } } } }, receipt: { select: { id: true, receiptNumber: true } } } });
}

export async function insertPayment(tx: TransactionClient, input: { paymentNumber: string; customerId: string; amount: Prisma.Decimal; paymentMethod: string; paymentReference?: string | null; paymentDate: Date; recordedByUserId: string | null }): Promise<PaymentDetailRow> {
  return tx.customerPayment.create({
    data: { paymentNumber: input.paymentNumber, customerId: input.customerId, amount: input.amount, paymentMethod: input.paymentMethod as never, paymentReference: input.paymentReference ?? null, paymentDate: input.paymentDate, recordedByUserId: input.recordedByUserId },
    include: { customer: { select: { name: true } }, allocations: { include: { invoice: { select: { invoiceNumber: true } } } }, receipt: { select: { id: true, receiptNumber: true } } },
  });
}

export async function approvePayment(tx: TransactionClient, id: string, input: { approvedByUserId: string | null; approvedAt: Date }): Promise<CustomerPayment | null> {
  return tx.customerPayment.update({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', approvedByUserId: input.approvedByUserId, approvedAt: input.approvedAt } });
}

export async function reversePayment(tx: TransactionClient, id: string, input: { reversedByUserId: string | null; reversedAt: Date; reversalReason: string }): Promise<CustomerPayment | null> {
  return tx.customerPayment.update({ where: { id, status: 'APPROVED' }, data: { status: 'REVERSED', reversedByUserId: input.reversedByUserId, reversedAt: input.reversedAt, reversalReason: input.reversalReason } });
}

export async function insertAllocations(tx: TransactionClient, paymentId: string, items: { invoiceId: string; amount: string }[]): Promise<void> {
  for (const item of items) {
    await tx.customerPaymentAllocation.create({ data: { paymentId, invoiceId: item.invoiceId, amount: new Prisma.Decimal(item.amount) } });
  }
}

export async function insertReceipt(tx: TransactionClient, input: { receiptNumber: string; paymentId: string; customerId: string; amount: Prisma.Decimal; customerBalanceAfterPayment: Prisma.Decimal; issuedByUserId: string | null; issuedAt: Date }) {
  return tx.receipt.create({ data: { receiptNumber: input.receiptNumber, paymentId: input.paymentId, customerId: input.customerId, amount: input.amount, customerBalanceAfterPayment: input.customerBalanceAfterPayment, issuedByUserId: input.issuedByUserId, issuedAt: input.issuedAt } });
}

export async function voidReceipt(tx: TransactionClient, paymentId: string): Promise<void> {
  await tx.receipt.updateMany({ where: { paymentId }, data: { status: 'VOIDED' } });
}
