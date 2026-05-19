-- Add index on session.shop for faster per-shop session lookups.
-- Without this every authenticate.admin() call does a full table scan.
CREATE INDEX `session_shop_idx` ON `session`(`shop`);
