-- Phase 6F-2: Vehicle rework.
-- Makes `vehicles.vehicleOwnerId` required (all 3 existing rows were
-- backfilled with real demo Vehicle Owner records in a prior data-only
-- step — see docs/database-notes.md) and removes the obsolete
-- `ownershipType` category and the Phase 4C volumetric truck-load fields.
-- The prior understanding behind those fields was incorrect: `1100` is the
-- Pumice purchase rate (KES per cubic metre), not a vehicle capacity
-- factor. See docs/decisions/business-workflow-update-2026-08-02.md
-- sections 10-12.4.

-- DropForeignKey
ALTER TABLE `vehicles` DROP FOREIGN KEY `vehicles_vehicleOwnerId_fkey`;

-- AlterTable
ALTER TABLE `vehicles` DROP COLUMN `calculatedLoadKg`,
    DROP COLUMN `calculatedLoadTonnes`,
    DROP COLUMN `calculationFactor`,
    DROP COLUMN `ownershipType`,
    DROP COLUMN `truckHeightM`,
    DROP COLUMN `truckLengthM`,
    DROP COLUMN `truckWidthM`,
    MODIFY `vehicleOwnerId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_vehicleOwnerId_fkey` FOREIGN KEY (`vehicleOwnerId`) REFERENCES `vehicle_owners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
