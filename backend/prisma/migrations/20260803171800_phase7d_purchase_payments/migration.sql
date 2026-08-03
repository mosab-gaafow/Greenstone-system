-- CreateTable
CREATE TABLE `purchase_payments` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `paymentMethod` ENUM('MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE') NOT NULL,
    `paymentReference` TEXT NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `evidenceStoredFileId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `reversedByUserId` VARCHAR(191) NULL,
    `reversedAt` DATETIME(3) NULL,
    `reversalReason` TEXT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_payments_paymentNumber_key`(`paymentNumber`),
    UNIQUE INDEX `purchase_payments_evidenceStoredFileId_key`(`evidenceStoredFileId`),
    INDEX `purchase_payments_supplierId_idx`(`supplierId`),
    INDEX `purchase_payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_payment_allocations` (
    `id` VARCHAR(191) NOT NULL,
    `purchasePaymentId` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `allocatedAmount` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `purchase_payment_allocations_purchasePaymentId_idx`(`purchasePaymentId`),
    INDEX `purchase_payment_allocations_purchaseId_idx`(`purchaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_evidenceStoredFileId_fkey` FOREIGN KEY (`evidenceStoredFileId`) REFERENCES `stored_files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_reversedByUserId_fkey` FOREIGN KEY (`reversedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_payment_allocations` ADD CONSTRAINT `purchase_payment_allocations_purchasePaymentId_fkey` FOREIGN KEY (`purchasePaymentId`) REFERENCES `purchase_payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_payment_allocations` ADD CONSTRAINT `purchase_payment_allocations_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
