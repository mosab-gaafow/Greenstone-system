import type { GeneratedDocumentType, RetentionType } from '../../generated/prisma/client.js';
import { getPrisma } from '../database/prisma.js';
import type { DbClient } from '../database/transaction.js';

/**
 * Generated-document and stored-file database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
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

export async function insertStoredFile(
  data: {
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    uploadedByUserId: string;
    retentionType: RetentionType;
  },
  client: DbClient = getPrisma(),
) {
  return client.storedFile.create({ data });
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
