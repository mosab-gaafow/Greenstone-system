-- Phase 6C-2 — Direct Order Foundation (2026-08-02)
-- See docs/decisions/business-workflow-update-2026-08-02.md and
-- docs/implementation-plan.md Phase 6C-2.
--
-- Hand-sequenced (not a raw `prisma migrate diff` output) to preserve
-- existing data: `paymentType` values must be remapped (CASH -> PREPAID),
-- which a plain enum/column rename cannot express.

-- 1. Add the new column nullable first, so existing rows can be backfilled
--    before it becomes required.
ALTER TABLE `orders` ADD COLUMN `paymentArrangement` ENUM('PREPAID', 'CREDIT') NULL;

-- 2. Backfill: CASH -> PREPAID, CREDIT -> CREDIT.
UPDATE `orders` SET `paymentArrangement` = CASE
  WHEN `paymentType` = 'CASH' THEN 'PREPAID'
  ELSE 'CREDIT'
END;

-- 3. Make it required now every row has a value.
ALTER TABLE `orders` MODIFY COLUMN `paymentArrangement` ENUM('PREPAID', 'CREDIT') NOT NULL;

-- 4. Drop the old column.
ALTER TABLE `orders` DROP COLUMN `paymentType`;

-- 5. Add order status. Every existing row defaults to PENDING — safe, since
--    no Production/Curing/Delivery workflow has run against these orders yet.
ALTER TABLE `orders` ADD COLUMN `status` ENUM(
  'PENDING', 'IN_PRODUCTION', 'CURING', 'READY_FOR_DELIVERY',
  'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELLED'
) NOT NULL DEFAULT 'PENDING';

-- 6. Written reason for cancellation, mirroring Quotation.statusReason.
ALTER TABLE `orders` ADD COLUMN `statusReason` TEXT NULL;

-- 7. Remove the quotation-conversion link. Confirmed safe by the Phase 6C-1
--    data audit (0 orders referenced a quotation at audit time). The FK and
--    its unique index must be dropped before the column itself.
ALTER TABLE `orders` DROP FOREIGN KEY `orders_sourceQuotationId_fkey`;
DROP INDEX `orders_sourceQuotationId_key` ON `orders`;
ALTER TABLE `orders` DROP COLUMN `sourceQuotationId`;

ALTER TABLE `order_items` DROP COLUMN `sourceQuotationItemId`;
