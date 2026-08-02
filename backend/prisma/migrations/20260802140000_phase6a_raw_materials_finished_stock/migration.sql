-- CreateTable
CREATE TABLE `measurement_units` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameNormalized` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `measurement_units_name_key`(`name`),
    UNIQUE INDEX `measurement_units_nameNormalized_key`(`nameNormalized`),
    INDEX `measurement_units_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `raw_materials` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameNormalized` VARCHAR(191) NOT NULL,
    `measurementUnitId` VARCHAR(191) NOT NULL,
    `reorderLevel` DECIMAL(14, 3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `raw_materials_name_key`(`name`),
    UNIQUE INDEX `raw_materials_nameNormalized_key`(`nameNormalized`),
    INDEX `raw_materials_isActive_idx`(`isActive`),
    INDEX `raw_materials_measurementUnitId_idx`(`measurementUnitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `raw_material_stock_balances` (
    `id` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `raw_material_stock_balances_rawMaterialId_key`(`rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `raw_material_movements` (
    `id` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NOT NULL,
    `movementType` ENUM('OPENING', 'PRODUCTION_USAGE', 'PURCHASE_RECEIPT', 'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT', 'CORRECTION') NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `balanceAfter` DECIMAL(14, 3) NOT NULL,
    `relatedEntityId` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `raw_material_movements_rawMaterialId_idx`(`rawMaterialId`),
    INDEX `raw_material_movements_movementType_idx`(`movementType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finished_stock_balances` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `physicalQuantity` INTEGER NOT NULL DEFAULT 0,
    `reservedQuantity` INTEGER NOT NULL DEFAULT 0,
    `availableQuantity` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `finished_stock_balances_productId_key`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finished_stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `movementType` ENUM('OPENING', 'CURING_RELEASE', 'GENERAL_STOCK_RELEASE', 'DELIVERY_DISPATCH', 'BROKEN', 'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT', 'CORRECTION') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `balanceAfter` INTEGER NOT NULL,
    `relatedEntityId` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `finished_stock_movements_productId_idx`(`productId`),
    INDEX `finished_stock_movements_movementType_idx`(`movementType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `broken_product_records` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `stage` ENUM('PRODUCTION', 'CURING', 'FINISHED_STOCK', 'DELIVERY') NOT NULL,
    `relatedEntityId` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `recordedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `broken_product_records_productId_idx`(`productId`),
    INDEX `broken_product_records_stage_idx`(`stage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_measurementUnitId_fkey` FOREIGN KEY (`measurementUnitId`) REFERENCES `measurement_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_stock_balances` ADD CONSTRAINT `raw_material_stock_balances_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `raw_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_movements` ADD CONSTRAINT `raw_material_movements_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `raw_materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `raw_material_movements` ADD CONSTRAINT `raw_material_movements_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finished_stock_balances` ADD CONSTRAINT `finished_stock_balances_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finished_stock_movements` ADD CONSTRAINT `finished_stock_movements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finished_stock_movements` ADD CONSTRAINT `finished_stock_movements_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `broken_product_records` ADD CONSTRAINT `broken_product_records_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `broken_product_records` ADD CONSTRAINT `broken_product_records_recordedByUserId_fkey` FOREIGN KEY (`recordedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
