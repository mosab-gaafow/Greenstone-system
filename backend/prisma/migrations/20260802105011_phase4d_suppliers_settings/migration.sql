-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `phoneNormalized` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `emailNormalized` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_phoneNormalized_key`(`phoneNormalized`),
    UNIQUE INDEX `suppliers_emailNormalized_key`(`emailNormalized`),
    INDEX `suppliers_isActive_idx`(`isActive`),
    INDEX `suppliers_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `paymentDetails` TEXT NULL,
    `footerNotes` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Note: `prisma migrate diff` also proposes `CREATE INDEX account_userId_idx`
-- and `CREATE INDEX session_userId_idx` here. Both already exist (pre-existing
-- Phase 2 Better Auth drift, unrelated to this migration) and are deliberately
-- omitted — see docs/database-notes.md.
