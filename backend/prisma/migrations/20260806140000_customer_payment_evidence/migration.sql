-- Add unique constraint and foreign key for customer payment evidence
ALTER TABLE `customer_payments` ADD UNIQUE INDEX `customer_payments_evidenceStoredFileId_key` (`evidenceStoredFileId`);
ALTER TABLE `customer_payments` ADD CONSTRAINT `customer_payments_evidenceStoredFileId_fkey` FOREIGN KEY (`evidenceStoredFileId`) REFERENCES `stored_files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
