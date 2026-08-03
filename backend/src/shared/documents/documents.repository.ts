import type { GeneratedDocumentType } from '../../generated/prisma/client.js';
import { getPrisma } from '../database/prisma.js';
import type { DbClient } from '../database/transaction.js';

/**
 * Generated-document database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 *
 * `insertStoredFile` moved to `shared/storage/storage.repository.ts` in
 * Phase 7D, once purchase-payment evidence became a second caller.
 */

export async function findLatestGeneratedDocument(
  documentType: GeneratedDocumentType,
  relatedEntityId: string,
  client: DbClient = getPrisma(),
) {
  return client.generatedDocument.findFirst({
    where: { documentType, relatedEntityId },
    orderBy: { version: 'desc' },
    include: { storedFile: true },
  });
}

export async function insertGeneratedDocument(
  data: {
    documentType: GeneratedDocumentType;
    relatedEntityId: string;
    documentNumber: string;
    version: number;
    storedFileId: string;
  },
  client: DbClient = getPrisma(),
) {
  return client.generatedDocument.create({ data, include: { storedFile: true } });
}
