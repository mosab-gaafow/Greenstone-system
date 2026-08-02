import type { GeneratedDocumentType } from '../../generated/prisma/client.js';

/**
 * Shared "generate an official PDF" pipeline types.
 *
 * See docs/technical-blueprint.md sections 4.14 and 9.
 */

export interface GenerateDocumentInput {
  documentType: GeneratedDocumentType;
  /** Id of the quotation, invoice, or receipt this document belongs to. */
  relatedEntityId: string;
  /** The official number, e.g. "QUO-2026-0001". Used only for the file name. */
  documentNumber: string;
  /** Fully rendered HTML, built by the calling module from saved data. */
  html: string;
  documentTitle: string;
  uploadedByUserId: string;
  /**
   * `updatedAt` of the source business record. A previously generated
   * version is reused whenever it was generated at or after this — nothing
   * has changed since, so there is no need to render again. Rendered PDF
   * bytes are not compared directly: Chromium embeds its own generation
   * timestamp, so two renders of identical input are never byte-identical.
   */
  sourceUpdatedAt: Date;
}

export interface GeneratedDocumentFile {
  id: string;
  documentType: GeneratedDocumentType;
  relatedEntityId: string;
  documentNumber: string;
  version: number;
  generatedAt: Date;
  mimeType: string;
  originalFileName: string;
  content: Buffer;
}
