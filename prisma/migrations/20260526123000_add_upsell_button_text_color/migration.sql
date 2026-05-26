SET @has_upsell_button_text_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'upsellsettings'
    AND COLUMN_NAME = 'buttonTextColor'
);
SET @sql_upsell_button_text_color := IF(
  @has_upsell_button_text_color = 0,
  'ALTER TABLE `upsellsettings` ADD COLUMN `buttonTextColor` VARCHAR(32) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_upsell_button_text_color;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
