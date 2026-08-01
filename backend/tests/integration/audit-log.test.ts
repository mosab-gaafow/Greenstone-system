import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DocumentType } from '../../src/generated/prisma/client.js';
import {
  recordAudit,
  recordAuditStandalone,
  withAuditContext,
} from '../../src/shared/audit/audit.service.js';
import { runInTransaction } from '../../src/shared/database/transaction.js';
import { allocateNumberInTransaction } from '../../src/shared/numbering/numbering.service.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

describe('audit log infrastructure', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('stores every approved audit field', async () => {
    const id = await recordAuditStandalone({
      userId: 'user-1',
      userName: 'Test User',
      userRole: 'ADMIN',
      action: 'CREATE',
      module: 'numbering',
      entityType: 'DocumentSequence',
      entityId: 'seq-1',
      documentNumber: 'INV-2026-0001',
      previousData: { lastNumber: 0 },
      updatedData: { lastNumber: 1 },
      reason: 'Test reason',
      requestId: 'req-1',
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });

    const stored = await getTestPrisma().auditLog.findUniqueOrThrow({ where: { id } });

    expect(stored).toMatchObject({
      userId: 'user-1',
      userName: 'Test User',
      userRole: 'ADMIN',
      action: 'CREATE',
      module: 'numbering',
      entityType: 'DocumentSequence',
      documentNumber: 'INV-2026-0001',
      reason: 'Test reason',
      requestId: 'req-1',
    });
    expect(stored.previousData).toEqual({ lastNumber: 0 });
    expect(stored.updatedData).toEqual({ lastNumber: 1 });
    expect(stored.createdAt).toBeInstanceOf(Date);
  });

  it('allows a system action with no user', async () => {
    const id = await recordAuditStandalone({
      action: 'SYSTEM_CHECK',
      module: 'health',
      entityType: 'System',
    });

    const stored = await getTestPrisma().auditLog.findUniqueOrThrow({ where: { id } });
    expect(stored.userId).toBeNull();
    expect(stored.previousData).toBeNull();
  });

  it('commits the audit row together with the business change', async () => {
    await runInTransaction(async (tx) => {
      const allocated = await allocateNumberInTransaction(tx, {
        documentType: DocumentType.INVOICE,
        year: 2026,
      });

      await recordAudit(tx, {
        action: 'ALLOCATE_NUMBER',
        module: 'numbering',
        entityType: 'DocumentSequence',
        documentNumber: allocated.documentNumber,
      });
    });

    const [sequences, audits] = await Promise.all([
      getTestPrisma().documentSequence.count(),
      getTestPrisma().auditLog.count(),
    ]);

    expect(sequences).toBe(1);
    expect(audits).toBe(1);
  });

  it('rolls the business change back when the audit write fails', async () => {
    await expect(
      runInTransaction(async (tx) => {
        await allocateNumberInTransaction(tx, {
          documentType: DocumentType.ORDER,
          year: 2026,
        });

        // `action` is a required column; a null violates it and fails the write.
        await recordAudit(tx, {
          action: null as unknown as string,
          module: 'numbering',
          entityType: 'DocumentSequence',
        });
      }),
    ).rejects.toThrow();

    // The business change must not have survived without its audit record.
    const sequences = await getTestPrisma().documentSequence.count();
    expect(sequences).toBe(0);
  });

  it('merges request context into an entry', () => {
    const entry = withAuditContext(
      {
        userId: 'user-9',
        userName: 'Amina',
        userRole: 'ACCOUNTANT',
        requestId: 'req-9',
        ipAddress: '10.0.0.1',
        userAgent: 'agent',
      },
      { action: 'UPDATE', module: 'customers', entityType: 'Customer', entityId: 'c-1' },
    );

    expect(entry).toMatchObject({
      userId: 'user-9',
      userRole: 'ACCOUNTANT',
      requestId: 'req-9',
      action: 'UPDATE',
      entityId: 'c-1',
    });
  });
});
