import type { DocumentType } from '../../generated/prisma/client.js';

export interface AllocateNumberInput {
  documentType: DocumentType;
  /** Africa/Nairobi calendar year. Defaults to the current year. */
  year?: number;
}

export interface AllocatedNumber {
  documentType: DocumentType;
  year: number;
  sequence: number;
  /** Formatted official number, for example `INV-2026-0001`. */
  documentNumber: string;
}
