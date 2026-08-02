-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `customerAddressId` VARCHAR(191) NOT NULL,
    `addressLabel` VARCHAR(191) NOT NULL,
    `addressLine` VARCHAR(191) NOT NULL,
    `addressDirections` TEXT NULL,
    `sourceQuotationId` VARCHAR(191) NULL,
    `paymentType` ENUM('CASH', 'CREDIT') NOT NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_orderNumber_key`(`orderNumber`),
    UNIQUE INDEX `orders_sourceQuotationId_key`(`sourceQuotationId`),
    INDEX `orders_customerId_idx`(`customerId`),
    INDEX `orders_customerAddressId_idx`(`customerAddressId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sourceQuotationItemId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `agreedUnitPrice` DECIMAL(12, 2) NOT NULL,
    `lineTotal` DECIMAL(14, 2) NOT NULL,
    `producedQuantity` INTEGER NOT NULL DEFAULT 0,
    `allocatedQuantity` INTEGER NOT NULL DEFAULT 0,
    `deliveredQuantity` INTEGER NOT NULL DEFAULT 0,
    `remainingQuantity` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `order_items_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_opening_balances` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL,
    `reason` TEXT NOT NULL,
    `enteredByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_opening_balances_customerId_key`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_credit_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `relatedOrderId` VARCHAR(191) NOT NULL,
    `previousCreditStatus` ENUM('NORMAL', 'WARNING', 'STRONG_WARNING', 'BLOCKED') NOT NULL,
    `reason` TEXT NOT NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_credit_overrides_customerId_idx`(`customerId`),
    INDEX `customer_credit_overrides_relatedOrderId_idx`(`relatedOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerAddressId_fkey` FOREIGN KEY (`customerAddressId`) REFERENCES `customer_addresses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_sourceQuotationId_fkey` FOREIGN KEY (`sourceQuotationId`) REFERENCES `quotations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_opening_balances` ADD CONSTRAINT `customer_opening_balances_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_opening_balances` ADD CONSTRAINT `customer_opening_balances_enteredByUserId_fkey` FOREIGN KEY (`enteredByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_credit_overrides` ADD CONSTRAINT `customer_credit_overrides_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_credit_overrides` ADD CONSTRAINT `customer_credit_overrides_relatedOrderId_fkey` FOREIGN KEY (`relatedOrderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_credit_overrides` ADD CONSTRAINT `customer_credit_overrides_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
