import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DocumentType } from '../../src/generated/prisma/client.js';
import { lockRowsForUpdate, runInTransaction } from '../../src/shared/database/transaction.js';
import { checkDatabaseConnection } from '../../src/shared/database/prisma.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

describe('transaction helpers', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('connects to the test database', async () => {
    await expect(checkDatabaseConnection(getTestPrisma())).resolves.toBeUndefined();
  });

  it('commits every write when the handler succeeds', async () => {
    await runInTransaction(async (tx) => {
      await tx.documentSequence.create({
        data: { documentType: DocumentType.INVOICE, year: 2026, lastNumber: 1 },
      });
      await tx.auditLog.create({
        data: { action: 'CREATE', module: 'test', entityType: 'DocumentSequence' },
      });
    });

    expect(await getTestPrisma().documentSequence.count()).toBe(1);
    expect(await getTestPrisma().auditLog.count()).toBe(1);
  });

  it('rolls every write back when the handler throws', async () => {
    await expect(
      runInTransaction(async (tx) => {
        await tx.documentSequence.create({
          data: { documentType: DocumentType.INVOICE, year: 2026, lastNumber: 1 },
        });
        await tx.auditLog.create({
          data: { action: 'CREATE', module: 'test', entityType: 'DocumentSequence' },
        });

        throw new Error('failed after both writes');
      }),
    ).rejects.toThrow('failed after both writes');

    expect(await getTestPrisma().documentSequence.count()).toBe(0);
    expect(await getTestPrisma().auditLog.count()).toBe(0);
  });

  it('returns the handler result', async () => {
    const result = await runInTransaction(async (tx) => {
      await tx.auditLog.create({
        data: { action: 'READ', module: 'test', entityType: 'System' },
      });
      return 'done';
    });

    expect(result).toBe('done');
  });

  it('takes a row lock without error', async () => {
    await getTestPrisma().documentSequence.create({
      data: { documentType: DocumentType.ORDER, year: 2026, lastNumber: 5 },
    });

    await runInTransaction(async (tx) => {
      await expect(
        lockRowsForUpdate(tx, 'document_sequences', 'year', 2026),
      ).resolves.toBeUndefined();
    });
  });

  it('refuses an unsafe SQL identifier', async () => {
    await runInTransaction(async (tx) => {
      await expect(
        lockRowsForUpdate(tx, 'document_sequences; DROP TABLE audit_logs', 'year', 2026),
      ).rejects.toThrow(/Unsafe SQL identifier/);
    });
  });

  it('enforces the unique constraint on document type and year', async () => {
    await getTestPrisma().documentSequence.create({
      data: { documentType: DocumentType.INVOICE, year: 2026, lastNumber: 1 },
    });

    await expect(
      getTestPrisma().documentSequence.create({
        data: { documentType: DocumentType.INVOICE, year: 2026, lastNumber: 1 },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
