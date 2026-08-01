-- Strict uniqueness for master data.
--
-- Written by hand rather than generated: adding a required, unique column to a
-- table that already has rows needs a backfill between the ADD COLUMN and the
-- unique index, which `prisma migrate dev` cannot express.
--
-- Each normalised column exists because a unique index on the raw value does not
-- actually prevent duplicates. "0722 123 456" and "0722123456" are the same
-- phone number, and "6 x 9" and "6 × 9" are the same product, but they are
-- different strings.

-- === Product ===============================================================

ALTER TABLE `products` ADD COLUMN `nameNormalized` VARCHAR(191) NULL;

-- Lowercase, collapse whitespace, and treat the multiplication sign as x.
UPDATE `products`
SET `nameNormalized` = LOWER(TRIM(REGEXP_REPLACE(REPLACE(`name`, '×', 'x'), '[[:space:]]+', ' ')));

ALTER TABLE `products` MODIFY COLUMN `nameNormalized` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `products_nameNormalized_key` ON `products`(`nameNormalized`);

-- === Customer ==============================================================

ALTER TABLE `customers` ADD COLUMN `phoneNormalized` VARCHAR(191) NULL;
ALTER TABLE `customers` ADD COLUMN `emailNormalized` VARCHAR(191) NULL;

-- Digits only, with a local leading 0 replaced by the Kenyan country code, so
-- every way of writing one number collapses to a single value.
UPDATE `customers`
SET `phoneNormalized` = CASE
  WHEN REGEXP_REPLACE(`phone`, '[^0-9]', '') LIKE '0%'
    THEN CONCAT('254', SUBSTRING(REGEXP_REPLACE(`phone`, '[^0-9]', ''), 2))
  ELSE REGEXP_REPLACE(`phone`, '[^0-9]', '')
END;

UPDATE `customers`
SET `emailNormalized` = LOWER(TRIM(`email`))
WHERE `email` IS NOT NULL AND TRIM(`email`) <> '';

ALTER TABLE `customers` MODIFY COLUMN `phoneNormalized` VARCHAR(191) NOT NULL;

-- MySQL permits many NULLs in a unique index, so customers without an email are
-- unaffected by the email constraint.
CREATE UNIQUE INDEX `customers_phoneNormalized_key` ON `customers`(`phoneNormalized`);
CREATE UNIQUE INDEX `customers_emailNormalized_key` ON `customers`(`emailNormalized`);

-- === CustomerAddress =======================================================

ALTER TABLE `customer_addresses` ADD COLUMN `labelNormalized` VARCHAR(191) NULL;

UPDATE `customer_addresses`
SET `labelNormalized` = LOWER(TRIM(REGEXP_REPLACE(`label`, '[[:space:]]+', ' ')));

ALTER TABLE `customer_addresses` MODIFY COLUMN `labelNormalized` VARCHAR(191) NOT NULL;

-- Unique per customer, not globally: two customers may each have a "Main site".
CREATE UNIQUE INDEX `customer_addresses_customerId_labelNormalized_key`
  ON `customer_addresses`(`customerId`, `labelNormalized`);
