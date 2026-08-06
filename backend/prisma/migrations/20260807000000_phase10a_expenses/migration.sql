-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `expenseNumber` VARCHAR(191) NOT NULL,
    `category` ENUM('ELECTRICITY', 'WATER', 'RENT', 'TRANSPORT', 'MAINTENANCE', 'SUPPLIES', 'COMMUNICATION', 'INSURANCE', 'LICENSES', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `paymentMethod` ENUM('MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE') NOT NULL,
    `paymentReference` VARCHAR(191) NULL,
    `expenseDate` DATETIME(3) NOT NULL,
    `evidenceStoredFileId` VARCHAR(191) NULL UNIQUE,
    `recordedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `expenses_expenseNumber_key`(`expenseNumber`),
    UNIQUE INDEX `expenses_evidenceStoredFileId_key`(`evidenceStoredFileId`),
    CONSTRAINT `expenses_evidenceStoredFileId_fkey` FOREIGN KEY (`evidenceStoredFileId`) REFERENCES `stored_files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `expenses_recordedByUserId_fkey` FOREIGN KEY (`recordedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
