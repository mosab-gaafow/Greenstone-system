-- AlterTable
ALTER TABLE `customer_credit_overrides` ADD COLUMN `relatedDeliveryId` VARCHAR(191) NULL,
    MODIFY `relatedOrderId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `deliveryNumber` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `customerAddressId` VARCHAR(191) NOT NULL,
    `addressLabel` VARCHAR(191) NOT NULL,
    `addressLine` VARCHAR(191) NOT NULL,
    `addressDirections` TEXT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `vehicleOwnerId` VARCHAR(191) NOT NULL,
    `payeeName` VARCHAR(191) NOT NULL,
    `payeePhone` VARCHAR(191) NOT NULL,
    `deliveryDate` DATETIME(3) NOT NULL,
    `status` ENUM('PLANNED', 'DISPATCHED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `transportRate` DECIMAL(12, 2) NULL,
    `numberOfTrips` INTEGER NULL,
    `totalTransportCost` DECIMAL(14, 2) NULL,
    `maxPiecesPerTruckSnapshot` INTEGER NULL,
    `cancelledReason` TEXT NULL,
    `cancelledByUserId` VARCHAR(191) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `dispatchedByUserId` VARCHAR(191) NULL,
    `dispatchedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `correctionReason` TEXT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `deliveries_deliveryNumber_key`(`deliveryNumber`),
    INDEX `deliveries_orderId_idx`(`orderId`),
    INDEX `deliveries_customerId_idx`(`customerId`),
    INDEX `deliveries_driverId_idx`(`driverId`),
    INDEX `deliveries_vehicleId_idx`(`vehicleId`),
    INDEX `deliveries_status_idx`(`status`),
    INDEX `deliveries_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_items` (
    `id` VARCHAR(191) NOT NULL,
    `deliveryId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `plannedQuantity` INTEGER NOT NULL,
    `reservedQuantity` INTEGER NOT NULL,
    `dispatchedQuantity` INTEGER NOT NULL DEFAULT 0,
    `deliveredQuantity` INTEGER NOT NULL DEFAULT 0,
    `brokenQuantity` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `delivery_items_deliveryId_idx`(`deliveryId`),
    INDEX `delivery_items_orderItemId_idx`(`orderItemId`),
    INDEX `delivery_items_productId_idx`(`productId`),
    UNIQUE INDEX `delivery_items_deliveryId_orderItemId_key`(`deliveryId`, `orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `customer_credit_overrides_relatedDeliveryId_idx` ON `customer_credit_overrides`(`relatedDeliveryId`);

-- AddForeignKey
ALTER TABLE `customer_credit_overrides` ADD CONSTRAINT `customer_credit_overrides_relatedDeliveryId_fkey` FOREIGN KEY (`relatedDeliveryId`) REFERENCES `deliveries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_customerAddressId_fkey` FOREIGN KEY (`customerAddressId`) REFERENCES `customer_addresses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_vehicleOwnerId_fkey` FOREIGN KEY (`vehicleOwnerId`) REFERENCES `vehicle_owners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_cancelledByUserId_fkey` FOREIGN KEY (`cancelledByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_dispatchedByUserId_fkey` FOREIGN KEY (`dispatchedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
