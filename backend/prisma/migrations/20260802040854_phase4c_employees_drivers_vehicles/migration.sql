-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `nationalId` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NOT NULL,
    `salaryFrequency` ENUM('WEEKLY', 'MONTHLY') NOT NULL,
    `salaryAmount` DECIMAL(12, 2) NOT NULL,
    `paymentMethod` ENUM('MPESA', 'CASH', 'BANK_TRANSFER', 'CHEQUE') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `employees_isActive_idx`(`isActive`),
    INDEX `employees_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drivers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `drivers_isActive_idx`(`isActive`),
    INDEX `drivers_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NOT NULL,
    `registrationNormalized` VARCHAR(191) NOT NULL,
    `vehicleType` VARCHAR(191) NOT NULL,
    `ownershipType` ENUM('COMPANY', 'HIRED') NOT NULL,
    `hireCost` DECIMAL(12, 2) NULL,
    `truckLengthM` DECIMAL(6, 2) NULL,
    `truckWidthM` DECIMAL(6, 2) NULL,
    `truckHeightM` DECIMAL(6, 2) NULL,
    `calculationFactor` DECIMAL(10, 2) NULL,
    `calculatedLoadKg` DECIMAL(12, 2) NULL,
    `calculatedLoadTonnes` DECIMAL(12, 3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicles_registrationNormalized_key`(`registrationNormalized`),
    INDEX `vehicles_isActive_idx`(`isActive`),
    INDEX `vehicles_ownershipType_idx`(`ownershipType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Note: this migration originally also generated `CREATE INDEX
-- account_userId_idx` and `CREATE INDEX session_userId_idx`. Both already
-- existed on the database (pre-existing drift from Phase 2, unrelated to
-- Phase 4C — Better Auth's own migration already creates them). Applying
-- them here failed with a duplicate-key error, so they were removed from
-- this file rather than run again.
