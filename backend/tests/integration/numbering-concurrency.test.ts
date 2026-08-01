import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DocumentType } from '../../src/generated/prisma/client.js';
import { allocateNumber } from '../../src/shared/numbering/numbering.service.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

/**
 * Document-numbering concurrency.
 *
 * This is a Phase 1 completion gate. Two simultaneous requests must never
 * receive the same official number.
 *
 * See docs/technical-blueprint.md section 10.3.
 */

describe('document numbering under concurrency', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('gives every concurrent caller a unique number', async () => {
    const concurrency = 20;

    const results = await Promise.all(
      Array.from({ length: concurrency }, () =>
        allocateNumber({ documentType: DocumentType.INVOICE, year: 2026 }),
      ),
    );

    const numbers = results.map((result) => result.documentNumber);
    expect(new Set(numbers).size).toBe(concurrency);
  });

  it('produces a gapless sequence starting at one', async () => {
    const concurrency = 20;

    const results = await Promise.all(
      Array.from({ length: concurrency }, () =>
        allocateNumber({ documentType: DocumentType.ORDER, year: 2026 }),
      ),
    );

    const sequences = results.map((result) => result.sequence).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: concurrency }, (_, index) => index + 1));
  });

  it('leaves the stored counter equal to the highest number issued', async () => {
    const concurrency = 15;

    await Promise.all(
      Array.from({ length: concurrency }, () =>
        allocateNumber({ documentType: DocumentType.RECEIPT, year: 2026 }),
      ),
    );

    const sequence = await getTestPrisma().documentSequence.findUnique({
      where: { documentType_year: { documentType: DocumentType.RECEIPT, year: 2026 } },
    });

    expect(sequence?.lastNumber).toBe(concurrency);
  });

  it('creates exactly one sequence row despite concurrent first requests', async () => {
    await Promise.all(
      Array.from({ length: 10 }, () =>
        allocateNumber({ documentType: DocumentType.DELIVERY, year: 2026 }),
      ),
    );

    const rows = await getTestPrisma().documentSequence.findMany({
      where: { documentType: DocumentType.DELIVERY, year: 2026 },
    });

    expect(rows).toHaveLength(1);
  });

  it('keeps separate sequences per document type', async () => {
    const [invoice, order] = await Promise.all([
      allocateNumber({ documentType: DocumentType.INVOICE, year: 2026 }),
      allocateNumber({ documentType: DocumentType.ORDER, year: 2026 }),
    ]);

    expect(invoice.documentNumber).toBe('INV-2026-0001');
    expect(order.documentNumber).toBe('ORD-2026-0001');
  });

  it('formats concurrent numbers correctly', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        allocateNumber({ documentType: DocumentType.PURCHASE, year: 2026 }),
      ),
    );

    const numbers = results.map((result) => result.documentNumber).sort();
    expect(numbers).toEqual([
      'PUR-2026-0001',
      'PUR-2026-0002',
      'PUR-2026-0003',
      'PUR-2026-0004',
      'PUR-2026-0005',
    ]);
  });
});
