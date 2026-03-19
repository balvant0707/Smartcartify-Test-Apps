-- Create upsellsettings table if it does not already exist (idempotent)
CREATE TABLE IF NOT EXISTS `upsellsettings` (
    `id`                    INTEGER       NOT NULL AUTO_INCREMENT,
    `shop`                  VARCHAR(255)  NOT NULL,
    `enabled`               BOOLEAN       NOT NULL DEFAULT true,
    `showAsSlider`          BOOLEAN       NOT NULL DEFAULT true,
    `autoplay`              BOOLEAN       NOT NULL DEFAULT true,
    `recommendationMode`    VARCHAR(32)   NOT NULL DEFAULT 'auto',
    `sectionTitle`          VARCHAR(255)  NULL,
    `buttonText`            VARCHAR(255)  NULL,
    `buttonColor`           VARCHAR(32)   NULL,
    `backgroundColor`       VARCHAR(32)   NULL,
    `textColor`             VARCHAR(32)   NULL,
    `borderColor`           VARCHAR(32)   NULL,
    `arrowColor`            VARCHAR(32)   NULL,
    `selectedProductIds`    LONGTEXT      NULL,
    `selectedCollectionIds` LONGTEXT      NULL,
    `createdAt`             DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`             DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `upsellsettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add buttonColor column in case the table existed without it (safe, ignored if column already exists)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'upsellsettings' AND COLUMN_NAME = 'buttonColor');
SET @sql = IF(@col = 0,
  'ALTER TABLE `upsellsettings` ADD COLUMN `buttonColor` VARCHAR(32) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
