import {
  Prisma,
  type PurchasePayment,
  type PurchasePaymentAllocation,
} from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type { ListPurchasePaymentsFilters } from './purchase-payments.types.js';

/**
 * Purchase payment database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type PurchasePaymentAllocationRow = PurchasePaymentAllocation & {
  purchase: { purchaseNumber: string };
};
export type PurchasePaymentRow = PurchasePayment & {
  supplier: { name: string };
  allocations: { allocatedAmount: Prisma.Decimal }[];
};
export type PurchasePaymentDetailRow = PurchasePayment & {
  supplier: { name: string };
  allocations: PurchasePaymentAllocationRow[];
  evidenceStoredFile: { storageKey: string; mimeType: string; originalFileName: string } | null;
};

const DETAIL_INCLUDE = {
  supplier: { select: { name: true } },
  allocations: {
    include: { purchase: { select: { purchaseNumber: true } } },
    orderBy: { createdAt: 'asc' },
  },
  evidenceStoredFile: {
    select: { storageKey: true, mimeType: true, originalFileName: true },
  },
} satisfies Prisma.PurchasePaymentInclude;

function buildWhere(filters: ListPurchasePaymentsFilters): Prisma.PurchasePaymentWhereInput {
  const where: Prisma.PurchasePaymentWhereInput = {};

  if (filters.search) {
    where.paymentNumber = { contains: filters.search };
  }
  if (filters.supplierId !== undefined) {
    where.supplierId = filters.supplierId;
  }
  if (filters.status !== undefined) {
    where.status = filters.status;
  }
  if (filters.purchaseId !== undefined) {
    where.allocations = { some: { purchaseId: filters.purchaseId } };
  }

  return where;
}

export async function findPurchasePayments(
  filters: ListPurchasePaymentsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: PurchasePaymentRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.purchasePayment.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: {
        supplier: { select: { name: true } },
        allocations: { select: { allocatedAmount: true } },
      },
    }),
    client.purchasePayment.count({ where }),
  ]);

  return { rows, total };
}

export async function findPurchasePaymentById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<PurchasePaymentDetailRow | null> {
  return client.purchasePayment.findUnique({ where: { id }, include: DETAIL_INCLUDE });
}

export async function insertPurchasePayment(
  input: {
    paymentNumber: string;
    supplierId: string;
    amount: Prisma.Decimal;
    paymentMethod: Prisma.PurchasePaymentCreateInput['paymentMethod'];
    paymentReference: string;
    paymentDate: Date;
    evidenceStoredFileId: string | null;
    createdByUserId: string | null;
    allocations: { purchaseId: string; allocatedAmount: Prisma.Decimal }[];
  },
  client: DbClient = getPrisma(),
): Promise<PurchasePaymentDetailRow> {
  return client.purchasePayment.create({
    data: {
      paymentNumber: input.paymentNumber,
      supplierId: input.supplierId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      paymentDate: input.paymentDate,
      evidenceStoredFileId: input.evidenceStoredFileId,
      createdByUserId: input.createdByUserId,
      allocations: { create: input.allocations },
    },
    include: DETAIL_INCLUDE,
  });
}

export async function approvePurchasePaymentRow(
  id: string,
  approvedByUserId: string | null,
  client: DbClient,
): Promise<PurchasePayment> {
  return client.purchasePayment.update({
    where: { id },
    data: { status: 'APPROVED', approvedByUserId, approvedAt: new Date() },
  });
}

export async function reversePurchasePaymentRow(
  id: string,
  reversedByUserId: string | null,
  reason: string,
  client: DbClient,
): Promise<PurchasePayment> {
  return client.purchasePayment.update({
    where: { id },
    data: { status: 'REVERSED', reversedByUserId, reversedAt: new Date(), reversalReason: reason },
  });
}

/**
 * Sum of `APPROVED` allocations against one purchase, across every payment —
 * used to compute that purchase's remaining unpaid amount at both creation
 * and approval time. `PENDING`/`REVERSED` payments' allocations never count.
 */
export async function sumApprovedAllocationsForPurchase(
  purchaseId: string,
  client: DbClient = getPrisma(),
): Promise<Prisma.Decimal> {
  const result = await client.purchasePaymentAllocation.aggregate({
    where: { purchaseId, purchasePayment: { status: 'APPROVED' } },
    _sum: { allocatedAmount: true },
  });

  return result._sum.allocatedAmount ?? new Prisma.Decimal(0);
}
