import { Prisma } from '../../generated/prisma/client.js';
import type { TransactionClient } from '../database/transaction.js';
import type { AuditLogInput } from './audit.types.js';

/**
 * Audit-log persistence.
 *
 * Insert only. Audit rows are never updated or deleted through the application.
 */
export async function insertAuditLog(tx: TransactionClient, input: AuditLogInput): Promise<string> {
  const created = await tx.auditLog.create({
    data: {
      userId: input.userId ?? null,
      userName: input.userName ?? null,
      userRole: input.userRole ?? null,
      action: input.action,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      documentNumber: input.documentNumber ?? null,
      previousData: toJsonValue(input.previousData),
      updatedData: toJsonValue(input.updatedData),
      reason: input.reason ?? null,
      requestId: input.requestId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
    select: { id: true },
  });

  return created.id;
}

/**
 * Converts an arbitrary value into something the Json column accepts.
 *
 * `Prisma.DbNull` writes a real SQL NULL. Passing plain `null` would be
 * interpreted as the JSON value `null`, which is a different thing.
 */
function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === undefined || value === null) {
    return Prisma.DbNull;
  }

  return value as Prisma.InputJsonValue;
}
