
-- CreateTable
CREATE TABLE `production_batches` (
    `id` VARCHAR(191) NOT NULL,
    `productionNumber` VARCHAR(191) NOT NULL,
    `productionDate` DATETIME(3) NOT NULL,
    `purpose` ENUM('ORDER', 'GENERAL_STOCK') NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `production_batches_productionNumber_key`(`productionNumber`),
    INDEX `production_batches_orderId_idx`(`orderId`),
    INDEX `production_batches_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_items` (
    `id` VARCHAR(191) NOT NULL,
    `productionBatchId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `pallets` INTEGER NOT NULL,
    `producedQuantity` INTEGER NOT NULL,
    `brokenQuantity` INTEGER NOT NULL DEFAULT 0,
    `usableQuantity` INTEGER NOT NULL,
    `allocatedQuantity` INTEGER NOT NULL DEFAULT 0,
    `excessQuantity` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `production_items_productionBatchId_idx`(`productionBatchId`),
    INDEX `production_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_order_allocations` (
    `id` VARCHAR(191) NOT NULL,
    `productionItemId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `production_order_allocations_productionItemId_idx`(`productionItemId`),
    INDEX `production_order_allocations_orderItemId_idx`(`orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `raw_material_usages` (
    `id` VARCHAR(191) NOT NULL,
    `productionBatchId` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `measurementUnitId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `raw_material_usages_productionBatchId_idx`(`productionBatchId`),
    INDEX `raw_material_usages_rawMaterialId_idx`(`rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `curing_records` (
    `id` VARCHAR(191) NOT NULL,
    `productionItemId` VARCHAR(191) NOT NULL,
    `productionBatchId` VARCHAR(191) NOT NULL,
    `quantityEntering` INTEGER NOT NULL,
    `originalDuration` ENUM('TWO_DAYS', 'THREE_DAYS') NOT NULL,
    `currentDuration` ENUM('TWO_DAYS', 'THREE_DAYS') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `plannedCompletion` DATETIME(3) NOT NULL,
    `actualRelease` DATETIME(3) NULL,
    `brokenQuantity` INTEGER NOT NULL DEFAULT 0,
    `releasedQuantity` INTEGER NULL,
    `durationChangeReason` TEXT NULL,
    `changedByUserId` VARCHAR(191) NULL,
    `changedAt` DATETIME(3) NULL,
    `releasedByUserId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `curing_records_productionItemId_key`(`productionItemId`),
    INDEX `curing_records_productionItemId_idx`(`productionItemId`),
    INDEX `curing_records_productionBatchId_idx`(`productionBatchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_items` ADD CONSTRAINT `production_items_productionBatchId_fkey` FOREIGN KEY (`productionBatchId`) REFERENCES `production_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_items` ADD CONSTRAINT `production_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_allocations` ADD CONSTRAINT `production_order_allocations_productionItemId_fkey` FOREIGN KEY (`productionItemId`) REFERENCES `production_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_allocations` ADD CONSTRAINT `production_order_allocations_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_usages` ADD CONSTRAINT `raw_material_usages_productionBatchId_fkey` FOREIGN KEY (`productionBatchId`) REFERENCES `production_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_usages` ADD CONSTRAINT `raw_material_usages_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `raw_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_usages` ADD CONSTRAINT `raw_material_usages_measurementUnitId_fkey` FOREIGN KEY (`measurementUnitId`) REFERENCES `measurement_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `curing_records` ADD CONSTRAINT `curing_records_productionItemId_fkey` FOREIGN KEY (`productionItemId`) REFERENCES `production_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `curing_records` ADD CONSTRAINT `curing_records_changedByUserId_fkey` FOREIGN KEY (`changedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `curing_records` ADD CONSTRAINT `curing_records_releasedByUserId_fkey` FOREIGN KEY (`releasedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `curing_records` ADD CONSTRAINT `curing_records_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

