-- Restore unique index on shop.shop column (required for Prisma upsert to work)
-- This index was dropped in 20251120125040_drop_shop_unique_constraints but the
-- Prisma schema still declares `shop @unique`, so Prisma upsert throws without it.

-- Remove any duplicate shop rows first (keep the most recently updated one)
DELETE s1 FROM `shop` s1
INNER JOIN `shop` s2
  ON s1.shop = s2.shop AND s1.updatedAt < s2.updatedAt;

-- Recreate the unique index
CREATE UNIQUE INDEX `shop_shop_key` ON `shop`(`shop`);
