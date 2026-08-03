-- Phase 6D: Product operational names, pieces per pallet, and truck capacity.
-- Purely additive — four new nullable columns, no existing column touched,
-- no data loss. See docs/decisions/business-workflow-update-2026-08-02.md
-- sections 2, 3, 12.2, 12.5, and 13.

-- AlterTable
ALTER TABLE `products`
  ADD COLUMN `operationalName` VARCHAR(191) NULL,
  ADD COLUMN `operationalNameNormalized` VARCHAR(191) NULL,
  ADD COLUMN `piecesPerPallet` INTEGER NULL,
  ADD COLUMN `maxPiecesPerTruck` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `products_operationalNameNormalized_key` ON `products`(`operationalNameNormalized`);

-- Backfill: confirmed operational names, pieces-per-pallet, and truck
-- capacities for the four already-approved products (business-blueprint
-- section 2.3). Matched by `nameNormalized`, never by the user-editable
-- `name`. Zero rows affected for a name that no longer matches is not an
-- error. Hollow Pot 150mm/200mm rows are deliberately left untouched — their
-- operational name stays empty, a confirmed decision, not a placeholder.
-- 230MM is not created, connected, or backfilled anywhere here — it remains
-- a pending product identification.

UPDATE `products`
SET `operationalName` = '4-inch', `operationalNameNormalized` = '4-inch',
    `piecesPerPallet` = 18, `maxPiecesPerTruck` = 1500
WHERE `nameNormalized` = 'hollow blocks 4 x 9';

UPDATE `products`
SET `operationalName` = '6-inch', `operationalNameNormalized` = '6-inch',
    `piecesPerPallet` = 12, `maxPiecesPerTruck` = 1200
WHERE `nameNormalized` = 'hollow blocks 6 x 9';

UPDATE `products`
SET `operationalName` = '9-inch', `operationalNameNormalized` = '9-inch',
    `piecesPerPallet` = NULL, `maxPiecesPerTruck` = 850
WHERE `nameNormalized` = 'hollow blocks 9 x 9';

UPDATE `products`
SET `operationalName` = '300mm', `operationalNameNormalized` = '300mm',
    `piecesPerPallet` = 6, `maxPiecesPerTruck` = 750
WHERE `nameNormalized` = 'hollow pot 380 x 200 x 300 mm';
