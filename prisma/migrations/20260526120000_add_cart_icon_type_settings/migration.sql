SET @has_cart_icon_type := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stylesettings'
    AND COLUMN_NAME = 'cartIconType'
);
SET @sql_cart_icon_type := IF(
  @has_cart_icon_type = 0,
  'ALTER TABLE `stylesettings` ADD COLUMN `cartIconType` VARCHAR(32) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_cart_icon_type;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_cart_default_icon := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'stylesettings'
    AND COLUMN_NAME = 'cartDefaultIcon'
);
SET @sql_cart_default_icon := IF(
  @has_cart_default_icon = 0,
  'ALTER TABLE `stylesettings` ADD COLUMN `cartDefaultIcon` VARCHAR(64) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_cart_default_icon;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
