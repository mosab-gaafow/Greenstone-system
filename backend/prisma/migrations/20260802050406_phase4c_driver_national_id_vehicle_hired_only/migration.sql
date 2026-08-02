-- Phase 4C revision: Driver national ID, Vehicle hired-only for the MVU.
--
-- Additive/safe: at the time this migration was written, `drivers` and
-- `vehicles` were both empty (the one test driver row was removed with
-- explicit approval before this migration was created — see
-- docs/implementation-plan.md Phase 4C). No data is lost by this migration.

-- DropIndex
DROP INDEX `vehicles_ownershipType_idx` ON `vehicles`;

-- AlterTable
ALTER TABLE `drivers` ADD COLUMN `nationalId` VARCHAR(191) NOT NULL,
    ADD COLUMN `nationalIdNormalized` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `vehicles` DROP COLUMN `hireCost`,
    MODIFY `ownershipType` ENUM('COMPANY', 'HIRED') NOT NULL DEFAULT 'HIRED',
    MODIFY `truckLengthM` DECIMAL(6, 2) NOT NULL,
    MODIFY `truckWidthM` DECIMAL(6, 2) NOT NULL,
    MODIFY `truckHeightM` DECIMAL(6, 2) NOT NULL,
    MODIFY `calculationFactor` DECIMAL(10, 2) NOT NULL,
    MODIFY `calculatedLoadKg` DECIMAL(12, 2) NOT NULL,
    MODIFY `calculatedLoadTonnes` DECIMAL(12, 3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `drivers_nationalIdNormalized_key` ON `drivers`(`nationalIdNormalized`);

-- Note: the diff also generated `CREATE INDEX account_userId_idx` and
-- `CREATE INDEX session_userId_idx`. Both already exist on the database
-- (the same pre-existing Phase 2 drift documented in the
-- phase4c_employees_drivers_vehicles migration) and are intentionally
-- omitted here.
