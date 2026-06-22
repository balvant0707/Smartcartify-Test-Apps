SET @has_upsell_button_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upsellsettings'
    AND COLUMN_NAME = 'buttonColor'
);
SET @sql_upsell_button_color := IF(
  @has_upsell_button_color = 1,
  'ALTER TABLE `upsellsettings` DROP COLUMN `buttonColor`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_upsell_button_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_upsell_button_text_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upsellsettings'
    AND COLUMN_NAME = 'buttonTextColor'
);
SET @sql_upsell_button_text_color := IF(
  @has_upsell_button_text_color = 1,
  'ALTER TABLE `upsellsettings` DROP COLUMN `buttonTextColor`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_upsell_button_text_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_upsell_background_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upsellsettings'
    AND COLUMN_NAME = 'backgroundColor'
);
SET @sql_upsell_background_color := IF(
  @has_upsell_background_color = 1,
  'ALTER TABLE `upsellsettings` DROP COLUMN `backgroundColor`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_upsell_background_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_upsell_text_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upsellsettings'
    AND COLUMN_NAME = 'textColor'
);
SET @sql_upsell_text_color := IF(
  @has_upsell_text_color = 1,
  'ALTER TABLE `upsellsettings` DROP COLUMN `textColor`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_upsell_text_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_upsell_border_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upsellsettings'
    AND COLUMN_NAME = 'borderColor'
);
SET @sql_upsell_border_color := IF(
  @has_upsell_border_color = 1,
  'ALTER TABLE `upsellsettings` DROP COLUMN `borderColor`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_upsell_border_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_upsell_arrow_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upsellsettings'
    AND COLUMN_NAME = 'arrowColor'
);
SET @sql_upsell_arrow_color := IF(
  @has_upsell_arrow_color = 1,
  'ALTER TABLE `upsellsettings` DROP COLUMN `arrowColor`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_upsell_arrow_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
