import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_PREFIXES,
  DocumentType,
  formatDocumentNumber,
} from '../../src/shared/constants/document-types.js';

describe('document number formatting', () => {
  it('uses the approved prefix for every document type', () => {
    // These prefixes come from business-blueprint.md section 3 and must not drift.
    // QUOTATION is kept (though no longer issued — Quotations removed, Phase
    // 6C-3) because a real historical document_sequences row still uses it.
    expect(DOCUMENT_PREFIXES).toEqual({
      QUOTATION: 'QUO',
      ORDER: 'ORD',
      PRODUCTION: 'PRD',
      DELIVERY: 'DEL',
      INVOICE: 'INV',
      RECEIPT: 'RCP',
      PURCHASE: 'PUR',
      CUSTOMER_PAYMENT: 'PAY',
      PURCHASE_PAYMENT: 'PPY',
      SALARY_PAYMENT: 'SAL',
      EXPENSE: 'EXP',
    });
  });

  it('formats the approved PREFIX-YYYY-0001 shape', () => {
    expect(formatDocumentNumber(DocumentType.QUOTATION, 2026, 1)).toBe('QUO-2026-0001');
    expect(formatDocumentNumber(DocumentType.INVOICE, 2026, 1)).toBe('INV-2026-0001');
    expect(formatDocumentNumber(DocumentType.ORDER, 2026, 42)).toBe('ORD-2026-0042');
  });

  it('pads to four digits', () => {
    expect(formatDocumentNumber(DocumentType.RECEIPT, 2026, 999)).toBe('RCP-2026-0999');
    expect(formatDocumentNumber(DocumentType.RECEIPT, 2026, 1000)).toBe('RCP-2026-1000');
  });

  it('keeps full width beyond four digits so numbers stay unique', () => {
    expect(formatDocumentNumber(DocumentType.EXPENSE, 2026, 12345)).toBe('EXP-2026-12345');
  });

  it('rejects a sequence that is not a positive integer', () => {
    expect(() => formatDocumentNumber(DocumentType.ORDER, 2026, 0)).toThrow();
    expect(() => formatDocumentNumber(DocumentType.ORDER, 2026, -1)).toThrow();
    expect(() => formatDocumentNumber(DocumentType.ORDER, 2026, 1.5)).toThrow();
  });

  it('covers every document type in the enum', () => {
    const enumValues = Object.values(DocumentType);
    expect(Object.keys(DOCUMENT_PREFIXES).sort()).toEqual([...enumValues].sort());
  });
});
