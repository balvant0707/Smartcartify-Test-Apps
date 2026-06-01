SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shippingrule' AND INDEX_NAME = 'shippingrule_shop_idx');
SET @sql = IF(@idx = 0, 'CREATE INDEX `shippingrule_shop_idx` ON `shippingrule`(`shop`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'discountrule' AND INDEX_NAME = 'discountrule_shop_idx');
SET @sql = IF(@idx = 0, 'CREATE INDEX `discountrule_shop_idx` ON `discountrule`(`shop`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'freegiftrule' AND INDEX_NAME = 'freegiftrule_shop_idx');
SET @sql = IF(@idx = 0, 'CREATE INDEX `freegiftrule_shop_idx` ON `freegiftrule`(`shop`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bxgyrule' AND INDEX_NAME = 'bxgyrule_shop_idx');
SET @sql = IF(@idx = 0, 'CREATE INDEX `bxgyrule_shop_idx` ON `bxgyrule`(`shop`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
