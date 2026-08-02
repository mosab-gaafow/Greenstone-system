import type { GeneratedDocumentType } from '../../generated/prisma/client.js';
import { renderPdf } from '../pdf/pdf.service.js';
import { getStorageProvider, storeFile } from '../storage/storage.service.js';
import { recordAudit } from '../audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../database/transaction.js';
import { toAuditContext, type RequestContext } from '../auth/auth-context.js';
import {
  findLatestGeneratedDocument,
  insertGeneratedDocument,
  insertStoredFile,
} from './documents.repository.js';
import type { GenerateDocumentInput, GeneratedDocumentFile } from './documents.types.js';

/**
 * Shared "generate an official PDF" pipeline.
 *
 * Built once here so Quotations (Phase 5A) and Invoices/Receipts (Phase 9)
 * share the same rules: the backend renders from saved data, the file is
 * stored permanently, and a `GeneratedDocument` row makes every version
 * traceable. See docs/technical-blueprint.md sections 4.14 and 9.
 *
 * A new version is only rendered when the source record has changed since
 * the last one was generated (`sourceUpdatedAt` newer than the latest
 * version's `generatedAt`) — this keeps repeat downloads of an unchanged
 * document from piling up duplicate files or launching Chromium needlessly.
 * Once a quotation (or later, an invoice/receipt) can no longer be edited,
 * every download after that reuses the same stored file.
 */

const STORAGE_CATEGORY: Record<GeneratedDocumentType, string> = {
  QUOTATION: 'quotation-pdfs',
  INVOICE: 'invoice-pdfs',
  RECEIPT: 'receipt-pdfs',
};

export async function generateOfficialDocument(
  input: GenerateDocumentInput,
  context: RequestContext,
): Promise<GeneratedDocumentFile> {
  const originalFileName = `${input.documentNumber}.pdf`;

  const latest = await findLatestGeneratedDocument(input.documentType, input.relatedEntityId);

  if (latest && input.sourceUpdatedAt <= latest.generatedAt) {
    const content = await getStorageProvider().get(latest.storedFile.storageKey);

    return {
      id: latest.id,
      documentType: latest.documentType,
      relatedEntityId: latest.relatedEntityId,
      documentNumber: latest.documentNumber,
      version: latest.version,
      generatedAt: latest.generatedAt,
      mimeType: latest.storedFile.mimeType,
      originalFileName: latest.storedFile.originalFileName,
      content,
    };
  }

  const rendered = await renderPdf({ html: input.html, documentTitle: input.documentTitle });

  // Storing the file happens before the transaction: it is not a database
  // operation, so it cannot participate in one. An orphaned file after a
  // rolled-back transaction is an accepted, standard tradeoff here — the
  // metadata row is what makes a file "real" to the rest of the system.
  const stored = await storeFile({
    content: rendered.content,
    mimeType: 'application/pdf',
    category: STORAGE_CATEGORY[input.documentType],
    originalFileName,
  });

  const nextVersion = (latest?.version ?? 0) + 1;

  const generated = await runInTransaction(async (tx: TransactionClient) => {
    const storedFile = await insertStoredFile(
      {
        storageKey: stored.storageKey,
        originalFileName,
        mimeType: 'application/pdf',
        sizeBytes: stored.sizeBytes,
        checksum: stored.checksum,
        uploadedByUserId: input.uploadedByUserId,
        retentionType: 'PERMANENT',
      },
      tx,
    );

    const document = await insertGeneratedDocument(
      {
        documentType: input.documentType,
        relatedEntityId: input.relatedEntityId,
        documentNumber: input.documentNumber,
        version: nextVersion,
        storedFileId: storedFile.id,
      },
      tx,
    );

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: `GENERATE_${input.documentType}_PDF`,
      module: 'documents',
      entityType: 'GeneratedDocument',
      entityId: document.id,
      updatedData: {
        documentType: input.documentType,
        relatedEntityId: input.relatedEntityId,
        documentNumber: input.documentNumber,
        version: nextVersion,
      },
    });

    return document;
  });

  return {
    id: generated.id,
    documentType: generated.documentType,
    relatedEntityId: generated.relatedEntityId,
    documentNumber: generated.documentNumber,
    version: generated.version,
    generatedAt: generated.generatedAt,
    mimeType: generated.storedFile.mimeType,
    originalFileName: generated.storedFile.originalFileName,
    content: rendered.content,
  };
}
