-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('HOLLOW_BLOCK', 'HOLLOW_POT') NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_name_key`(`name`),
    INDEX `products_isActive_idx`(`isActive`),
    INDEX `products_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- NOTE
-- Prisma also generated `CREATE INDEX account_userId_idx` and
-- `CREATE INDEX session_userId_idx` here. Both were removed by hand.
--
-- They already exist: the phase2_better_auth migration creates them inline in
-- its CREATE TABLE statements. Prisma's schema diff does not round-trip MySQL
-- prefix indexes (`userId`(191)), so it believes they are missing and re-emits
-- them on every migration. Applying them fails with error 1061, duplicate key
-- name.
--
-- Expect to remove these two statements from future generated migrations too,
-- for as long as the Better Auth generated schema uses a prefix length.
