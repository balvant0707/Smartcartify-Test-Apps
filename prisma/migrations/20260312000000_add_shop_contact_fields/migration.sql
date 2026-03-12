-- Add merchant contact & status fields to shop table (safe / idempotent)

-- firstName
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'firstName');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `firstName` VARCHAR(255) NULL AFTER `updatedAt`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- lastName
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'lastName');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `lastName` VARCHAR(255) NULL AFTER `firstName`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- email
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'email');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `email` VARCHAR(320) NULL AFTER `lastName`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- domain
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'domain');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `domain` VARCHAR(255) NULL AFTER `email`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- contactNumber
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'contactNumber');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `contactNumber` VARCHAR(50) NULL AFTER `domain`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- appStatus
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'appStatus');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `appStatus` VARCHAR(20) NOT NULL DEFAULT ''active'' AFTER `contactNumber`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
