-- Phase 6F-1: Vehicle Owners module.
-- Creates `vehicle_owners`, and adds `vehicles.vehicleOwnerId` as NULLABLE —
-- the 3 existing Vehicle rows have no owner information to derive from and
-- must not have one invented (see
-- docs/decisions/business-workflow-update-2026-08-02.md section 16 and the
-- Phase 6F planning report). A later migration backfills them with approved
-- data and only then makes this column required.

-- CreateTable
CREATE TABLE `vehicle_owners` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `phoneNormalized` VARCHAR(191) NOT NULL,
    `nationalId` VARCHAR(191) NULL,
    `nationalIdNormalized` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_owners_phoneNormalized_key`(`phoneNormalized`),
    UNIQUE INDEX `vehicle_owners_nationalIdNormalized_key`(`nationalIdNormalized`),
    INDEX `vehicle_owners_isActive_idx`(`isActive`),
    INDEX `vehicle_owners_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `vehicles` ADD COLUMN `vehicleOwnerId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `vehicles_vehicleOwnerId_idx` ON `vehicles`(`vehicleOwnerId`);

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_vehicleOwnerId_fkey` FOREIGN KEY (`vehicleOwnerId`) REFERENCES `vehicle_owners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
