import type { RetentionType } from '../../generated/prisma/client.js';
import { getPrisma } from '../database/prisma.js';
import type { DbClient } from '../database/transaction.js';

/**
 * Stored-file database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 *
 * Extracted from `shared/documents/documents.repository.ts` when a second
 * caller (Phase 7D's purchase-payment evidence) needed to create a
 * `StoredFile` row outside the "generate an official PDF" pipeline — the
 * same "extract once a second module needs it" pattern already used for
 * shared normalisation helpers.
 */
export async function insertStoredFile(
  data: {
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    uploadedByUserId: string | null;
    retentionType: RetentionType;
  },
  client: DbClient = getPrisma(),
) {
  return client.storedFile.create({ data });
}
