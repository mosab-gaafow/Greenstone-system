-- Phase 6E addendum: Customer deactivation safeguards.
-- Purely additive — one new nullable column, no existing column touched,
-- no data loss. See docs/decisions/business-workflow-update-2026-08-02.md
-- section 16.

-- AlterTable
ALTER TABLE `customers` ADD COLUMN `deactivationReason` TEXT NULL;
