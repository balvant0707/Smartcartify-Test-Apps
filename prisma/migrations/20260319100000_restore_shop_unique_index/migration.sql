-- Restore unique index on shop.shop column (idempotent — skips if already exists)

-- Remove any duplicate shop rows first (keep the most recently updated one)
DELETE s1 FROM `shop` s1
INNER JOIN `shop` s2
  ON s1.shop = s2.shop AND s1.updatedAt < s2.updatedAt;

-- Create unique index only if it doesn't already exist
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop' AND INDEX_NAME = 'shop_shop_key');
SET @sql = IF(@idx = 0,
  'CREATE UNIQUE INDEX `shop_shop_key` ON `shop`(`shop`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
