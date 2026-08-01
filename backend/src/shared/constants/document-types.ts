import { DocumentType } from '../../generated/prisma/client.js';

/**
 * Official document number prefixes.
 *
 * Format: `PREFIX-YYYY-0001`, where YYYY is the Africa/Nairobi calendar year and
 * the sequence restarts each year.
 *
 * Values come from the approved numbering table in
 * docs/business-blueprint.md section 3. Do not add a document type here unless
 * it is approved there.
 */
export const DOCUMENT_PREFIXES: Readonly<Record<DocumentType, string>> = {
  [DocumentType.QUOTATION]: 'QUO',
  [DocumentType.ORDER]: 'ORD',
  [DocumentType.PRODUCTION]: 'PRD',
  [DocumentType.DELIVERY]: 'DEL',
  [DocumentType.INVOICE]: 'INV',
  [DocumentType.RECEIPT]: 'RCP',
  [DocumentType.PURCHASE]: 'PUR',
  [DocumentType.CUSTOMER_PAYMENT]: 'PAY',
  [DocumentType.PURCHASE_PAYMENT]: 'PPY',
  [DocumentType.SALARY_PAYMENT]: 'SAL',
  [DocumentType.EXPENSE]: 'EXP',
};

/** Minimum digits in the sequence part of a document number. */
export const DOCUMENT_SEQUENCE_PADDING = 4;

/**
 * Formats an official document number.
 *
 * Sequences beyond 9999 keep their full width rather than wrapping, so numbers
 * stay unique.
 */
export function formatDocumentNumber(
  documentType: DocumentType,
  year: number,
  sequence: number,
): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Document sequence must be a positive integer, received ${sequence}`);
  }

  const prefix = DOCUMENT_PREFIXES[documentType];
  const padded = String(sequence).padStart(DOCUMENT_SEQUENCE_PADDING, '0');

  return `${prefix}-${year}-${padded}`;
}

export { DocumentType };
