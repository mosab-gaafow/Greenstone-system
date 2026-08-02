-- AlterTable
ALTER TABLE `quotation_items` ADD COLUMN `sortOrder` INTEGER NOT NULL;

-- Note: `prisma migrate diff` also proposes `CREATE INDEX account_userId_idx`
-- and `CREATE INDEX session_userId_idx` here. Both already exist (pre-existing
-- Phase 2 Better Auth drift, unrelated to this migration) and are deliberately
-- omitted — see docs/database-notes.md.
