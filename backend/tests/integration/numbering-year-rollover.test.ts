import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DocumentType } from '../../src/generated/prisma/client.js';
import {
  allocateNumber,
  allocateNumberInTransaction,
} from '../../src/shared/numbering/numbering.service.js';
import { runInTransaction } from '../../src/shared/database/transaction.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

describe('document numbering across years', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('restarts the sequence each calendar year', async () => {
    const first2026 = await allocateNumber({ documentType: DocumentType.INVOICE, year: 2026 });
    const second2026 = await allocateNumber({ documentType: DocumentType.INVOICE, year: 2026 });
    const first2027 = await allocateNumber({ documentType: DocumentType.INVOICE, year: 2027 });

    expect(first2026.documentNumber).toBe('INV-2026-0001');
    expect(second2026.documentNumber).toBe('INV-2026-0002');
    expect(first2027.documentNumber).toBe('INV-2027-0001');
  });

  it('keeps a separate counter row per year', async () => {
    await allocateNumber({ documentType: DocumentType.ORDER, year: 2026 });
    await allocateNumber({ documentType: DocumentType.ORDER, year: 2027 });

    const rows = await getTestPrisma().documentSequence.findMany({
      where: { documentType: DocumentType.ORDER },
    });

    expect(rows).toHaveLength(2);
  });

  it('rolls back the number when the surrounding transaction fails', async () => {
    await allocateNumber({ documentType: DocumentType.EXPENSE, year: 2026 });

    await expect(
      runInTransaction(async (tx) => {
        await allocateNumberInTransaction(tx, {
          documentType: DocumentType.EXPENSE,
          year: 2026,
        });
        throw new Error('business rule failed after allocating');
      }),
    ).rejects.toThrow('business rule failed after allocating');

    // The failed allocation must not have consumed 0002.
    const next = await allocateNumber({ documentType: DocumentType.EXPENSE, year: 2026 });
    expect(next.documentNumber).toBe('EXP-2026-0002');
  });

  it('allocates inside a caller transaction without opening a second one', async () => {
    const result = await runInTransaction((tx) =>
      allocateNumberInTransaction(tx, { documentType: DocumentType.SALARY_PAYMENT, year: 2026 }),
    );

    expect(result.documentNumber).toBe('SAL-2026-0001');
  });
});
