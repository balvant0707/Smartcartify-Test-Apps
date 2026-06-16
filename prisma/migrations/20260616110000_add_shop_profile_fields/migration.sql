-- Add full shop profile and lifecycle fields to shop table.
-- Safe/idempotent for stores that may already have some columns from older migrations.

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'name');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `name` VARCHAR(255) NULL AFTER `lastName`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'ownerName');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `ownerName` VARCHAR(255) NULL AFTER `name`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'phone');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `phone` VARCHAR(50) NULL AFTER `contactNumber`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'city');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `city` VARCHAR(255) NULL AFTER `phone`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'country');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `country` VARCHAR(255) NULL AFTER `city`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'currency');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `currency` VARCHAR(10) NULL AFTER `country`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND COLUMN_NAME = 'status');
SET @sql = IF(@col = 0,
  'ALTER TABLE `shop` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT ''installed'' AFTER `appStatus`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
