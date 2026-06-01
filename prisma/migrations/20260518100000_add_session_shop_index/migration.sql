-- Add index on session.shop for faster per-shop session lookups.
-- Without this every authenticate.admin() call does a full table scan.
SET @idx = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'session'
    AND INDEX_NAME = 'session_shop_idx'
);
SET @sql = IF(@idx = 0,
  'CREATE INDEX `session_shop_idx` ON `session`(`shop`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
