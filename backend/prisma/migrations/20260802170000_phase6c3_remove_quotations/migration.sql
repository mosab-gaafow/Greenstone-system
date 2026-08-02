-- Phase 6C-3 — Safe Quotation Removal (2026-08-02)
-- See docs/decisions/business-workflow-update-2026-08-02.md and
-- docs/implementation-plan.md Phase 6C-3.
--
-- Confirmed safe by the Phase 6C-1 data audit (0 Order rows referenced a
-- quotation) and the business owner's explicit confirmation that all
-- existing quotation data (3 quotations, 4 items, 1 generated PDF) is
-- development test data, not production records. The physical PDF file was
-- removed separately via a one-off script before this migration ran — SQL
-- cannot touch the filesystem.
--
-- Does not touch `DocumentType.QUOTATION` or its `document_sequences` row
-- (year 2026, last number 3) — that historical numbering record is kept
-- permanently, per the project's no-hard-delete rule for issued document
-- records. Only `GeneratedDocumentType` is narrowed, since its one QUOTATION
-- row is deleted below, leaving no historical conflict.

-- 1. Remove the one Quotation-type generated-document record and its
--    stored-file metadata row.
DELETE FROM `generated_documents` WHERE `documentType` = 'QUOTATION';
DELETE FROM `stored_files` WHERE `storageKey` LIKE 'quotation-pdfs/%';

-- 2. Narrow GeneratedDocumentType now that no row uses QUOTATION.
ALTER TABLE `generated_documents` MODIFY `documentType` ENUM('INVOICE', 'RECEIPT') NOT NULL;

-- 3. Drop Quotation tables (child before parent).
ALTER TABLE `quotation_items` DROP FOREIGN KEY `quotation_items_productId_fkey`;
ALTER TABLE `quotation_items` DROP FOREIGN KEY `quotation_items_quotationId_fkey`;
ALTER TABLE `quotations` DROP FOREIGN KEY `quotations_customerId_fkey`;

DROP TABLE `quotation_items`;
DROP TABLE `quotations`;
