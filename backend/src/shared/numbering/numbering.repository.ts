import { randomUUID } from 'node:crypto';
import type { DocumentType } from '../../generated/prisma/client.js';
import { InternalServerError } from '../errors/app-error.js';
import type { TransactionClient } from '../database/transaction.js';

/**
 * Database access for document sequences.
 *
 * Every function here must run inside a transaction. The caller opens it; see
 * numbering.service.ts.
 */

interface SequenceRow {
  lastNumber: number;
}

/**
 * Atomically creates or increments the counter for a document type and year,
 * returning the newly allocated value.
 *
 * `SELECT ... FOR UPDATE` is deliberately **not** used here. On a row that does
 * not exist yet it acquires no row lock, so concurrent first requests for a new
 * year all fall through to `INSERT` and deadlock on the unique index. A single
 * `INSERT ... ON DUPLICATE KEY UPDATE` avoids that: it creates the row or
 * increments the existing one in one statement, and holds an exclusive lock on
 * the index entry for the rest of the transaction.
 *
 * The follow-up `SELECT` runs in the same transaction, on the row this
 * transaction now owns, so it always reads back this caller's own value.
 *
 * See docs/technical-blueprint.md section 10.3.
 */
export async function allocateSequenceValue(
  tx: TransactionClient,
  documentType: DocumentType,
  year: number,
): Promise<number> {
  await tx.$executeRaw`
    INSERT INTO document_sequences (id, documentType, year, lastNumber, createdAt, updatedAt)
    VALUES (${randomUUID()}, ${documentType}, ${year}, 1, NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE lastNumber = lastNumber + 1, updatedAt = NOW(3)
  `;

  const rows = await tx.$queryRaw<SequenceRow[]>`
    SELECT lastNumber
    FROM document_sequences
    WHERE documentType = ${documentType} AND year = ${year}
  `;

  const lastNumber = rows[0]?.lastNumber;

  if (lastNumber === undefined) {
    throw new InternalServerError(
      `Sequence row for ${documentType} ${year} disappeared during allocation.`,
    );
  }

  return Number(lastNumber);
}
