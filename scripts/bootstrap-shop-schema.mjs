import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withDbRetry = async (operation, label) => {
  const delays = [0, 750, 1500, 3000];
  let lastError;

  for (const delay of delays) {
    if (delay) await wait(delay);

    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "");
      const retryable =
        message.includes("Can't reach database server") ||
        message.includes("Timed out fetching a new connection") ||
        message.includes("Connection terminated") ||
        message.includes("ECONNRESET") ||
        message.includes("ETIMEDOUT");

      if (!retryable) throw error;
      console.warn(`[bootstrap:shop] ${label} failed; retrying...`);
    }
  }

  throw lastError;
};

const readCount = async (sql) => {
  const rows = await withDbRetry(
    () => prisma.$queryRawUnsafe(sql),
    "Database read",
  );
  const first = Array.isArray(rows) ? rows[0] : null;
  const value = first ? Object.values(first)[0] : 0;
  return Number(value || 0);
};

const executeSql = async (sql) =>
  withDbRetry(() => prisma.$executeRawUnsafe(sql), "Database write");

const tableExists = async (tableName) =>
  readCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'`,
  );

const columnExists = async (columnName) =>
  readCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'shop'
       AND COLUMN_NAME = '${columnName}'`,
  );

const uniqueShopIndexExists = async () =>
  readCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'shop'
       AND COLUMN_NAME = 'shop'
       AND NON_UNIQUE = 0`,
  );

const tableColumnExists = async (tableName, columnName) =>
  readCount(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = '${tableName}'
       AND COLUMN_NAME = '${columnName}'`,
  );

const ensureShopTable = async () => {
  const lowercaseExists = await tableExists("shop");
  const uppercaseExists = await tableExists("Shop");

  if (!lowercaseExists && uppercaseExists) {
    await executeSql("RENAME TABLE `Shop` TO `shop`");
    console.log("[bootstrap:shop] Renamed `Shop` to `shop`.");
    return;
  }

  if (!lowercaseExists && !uppercaseExists) {
    await executeSql(`
      CREATE TABLE IF NOT EXISTS \`shop\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`shop\` VARCHAR(255) NOT NULL,
        \`accessToken\` TEXT NULL,
        \`installed\` BOOLEAN NOT NULL DEFAULT false,
        \`uninstalledAt\` DATETIME(3) NULL,
        \`onboardedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`firstName\` VARCHAR(255) NULL,
        \`lastName\` VARCHAR(255) NULL,
        \`name\` VARCHAR(255) NULL,
        \`ownerName\` VARCHAR(255) NULL,
        \`email\` VARCHAR(320) NULL,
        \`domain\` VARCHAR(255) NULL,
        \`contactNumber\` VARCHAR(50) NULL,
        \`phone\` VARCHAR(50) NULL,
        \`city\` VARCHAR(255) NULL,
        \`country\` VARCHAR(255) NULL,
        \`currency\` VARCHAR(10) NULL,
        \`appStatus\` VARCHAR(20) NOT NULL DEFAULT 'active',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'installed',
        \`reviewSubmittedAt\` DATETIME(3) NULL,
        \`reviewRating\` INTEGER NULL,
        \`reviewComment\` TEXT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`shop_shop_key\` (\`shop\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log("[bootstrap:shop] Created missing `shop` table.");
  }
};

const ensureLowercaseTable = async (legacyName, tableName) => {
  const lowercaseExists = await tableExists(tableName);
  const legacyExists = await tableExists(legacyName);

  if (!lowercaseExists && legacyExists) {
    await executeSql(`RENAME TABLE \`${legacyName}\` TO \`${tableName}\``);
    console.log(`[bootstrap:shop] Renamed \`${legacyName}\` to \`${tableName}\`.`);
  }
};

const ensureColumn = async (columnName, definition) => {
  const exists = await columnExists(columnName);
  if (exists) return;
  await executeSql(
    `ALTER TABLE \`shop\` ADD COLUMN \`${columnName}\` ${definition}`,
  );
  console.log(`[bootstrap:shop] Added missing column \`${columnName}\`.`);
};

const ensureUniqueShopIndex = async () => {
  const hasUniqueIndex = await uniqueShopIndexExists();
  if (hasUniqueIndex) return;

  await executeSql(`
    DELETE s1 FROM \`shop\` s1
    INNER JOIN \`shop\` s2
      ON s1.shop = s2.shop AND s1.id < s2.id
  `);
  await executeSql(
    "CREATE UNIQUE INDEX `shop_shop_key` ON `shop`(`shop`)",
  );
  console.log("[bootstrap:shop] Restored unique index on `shop.shop`.");
};

const ensureTableColumn = async (tableName, columnName, definition) => {
  const exists = await tableColumnExists(tableName, columnName);
  if (exists) return;
  await executeSql(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`,
  );
  console.log(`[bootstrap:shop] Added missing column \`${tableName}.${columnName}\`.`);
};

const ensureTableColumns = async (tableName, columns) => {
  if (!(await tableExists(tableName))) return;

  for (const [columnName, definition] of columns) {
    await ensureTableColumn(tableName, columnName, definition);
  }
};

const ensureCampaignTables = async () => {
  await ensureLowercaseTable("ShippingRule", "shippingrule");
  await ensureLowercaseTable("DiscountRule", "discountrule");
  await ensureLowercaseTable("FreeGiftRule", "freegiftrule");
  await ensureLowercaseTable("BxgyRule", "bxgyrule");

  await ensureTableColumns("shippingrule", [
    ["iconChoice", "VARCHAR(191) NULL DEFAULT 'truck'"],
    ["shopifyRateId", "VARCHAR(255) NULL"],
    ["shopifyMethodDefinitionId", "VARCHAR(255) NULL"],
    ["progressTextBefore", "TEXT NULL"],
    ["progressTextAfter", "TEXT NULL"],
    ["progressTextBelow", "TEXT NULL"],
    ["campaignName", "VARCHAR(255) NULL"],
    ["cartStepName", "VARCHAR(255) NULL"],
    ["startsAt", "DATETIME(3) NULL"],
    ["endsAt", "DATETIME(3) NULL"],
    ["priority", "INTEGER NOT NULL DEFAULT 0"],
    ["customerTarget", "VARCHAR(32) NOT NULL DEFAULT 'all'"],
    ["customerTags", "LONGTEXT NULL"],
    ["templateKey", "VARCHAR(64) NULL"],
    ["abTestEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["abTestVariant", "VARCHAR(32) NULL"],
    ["translations", "LONGTEXT NULL"],
    ["analyticsImpressions", "INTEGER NOT NULL DEFAULT 0"],
    ["analyticsConversions", "INTEGER NOT NULL DEFAULT 0"],
    ["maxSubtotal", "VARCHAR(191) NULL"],
  ]);

  await ensureTableColumns("discountrule", [
    ["triggerType", "VARCHAR(32) NOT NULL DEFAULT 'amount'"],
    ["minQuantity", "VARCHAR(191) NULL"],
    ["iconChoice", "VARCHAR(191) NULL DEFAULT 'tag'"],
    ["shopifyDiscountCodeId", "VARCHAR(255) NULL"],
    ["shopifyPriceRuleId", "VARCHAR(255) NULL"],
    ["discountCode", "VARCHAR(255) NULL"],
    ["progressTextBefore", "TEXT NULL"],
    ["progressTextAfter", "TEXT NULL"],
    ["quantityProgressTextBefore", "TEXT NULL"],
    ["quantityProgressTextAfter", "TEXT NULL"],
    ["progressTextBelow", "TEXT NULL"],
    ["campaignName", "VARCHAR(255) NULL"],
    ["cartStepName", "VARCHAR(255) NULL"],
    ["codeCampaignName", "VARCHAR(255) NULL"],
    ["valueType", "VARCHAR(191) NOT NULL DEFAULT 'percent'"],
    ["usageLimitEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["usageLimit", "VARCHAR(255) NULL"],
    ["appliesOncePerCustomer", "BOOLEAN NOT NULL DEFAULT false"],
    ["appliesTo", "LONGTEXT NULL"],
    ["codeDiscountId", "VARCHAR(255) NULL"],
    ["condition", "VARCHAR(255) NULL"],
    ["rewardType", "VARCHAR(255) NOT NULL DEFAULT 'percent'"],
    ["scope", "VARCHAR(255) NULL"],
    ["startsAt", "DATETIME(3) NULL"],
    ["endsAt", "DATETIME(3) NULL"],
    ["priority", "INTEGER NOT NULL DEFAULT 0"],
    ["customerTarget", "VARCHAR(32) NOT NULL DEFAULT 'all'"],
    ["customerTags", "LONGTEXT NULL"],
    ["templateKey", "VARCHAR(64) NULL"],
    ["abTestEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["abTestVariant", "VARCHAR(32) NULL"],
    ["translations", "LONGTEXT NULL"],
    ["analyticsImpressions", "INTEGER NOT NULL DEFAULT 0"],
    ["analyticsConversions", "INTEGER NOT NULL DEFAULT 0"],
  ]);

  await ensureTableColumns("freegiftrule", [
    ["triggerType", "VARCHAR(32) NOT NULL DEFAULT 'amount'"],
    ["minQuantity", "VARCHAR(191) NULL"],
    ["iconChoice", "VARCHAR(191) NULL DEFAULT 'gift'"],
    ["bonusProductId", "VARCHAR(255) NULL"],
    ["freeProductDiscountID", "VARCHAR(255) NULL"],
    ["minAmountFreeGiftDiscountId", "VARCHAR(255) NULL"],
    ["minAmountShippingRateId", "VARCHAR(255) NULL"],
    ["allProductIds", "LONGTEXT NULL"],
    ["progressTextBefore", "TEXT NULL"],
    ["progressTextAfter", "TEXT NULL"],
    ["quantityProgressTextBefore", "TEXT NULL"],
    ["quantityProgressTextAfter", "TEXT NULL"],
    ["progressTextBelow", "TEXT NULL"],
    ["campaignName", "VARCHAR(255) NULL"],
    ["cartStepName", "VARCHAR(255) NULL"],
    ["startsAt", "DATETIME(3) NULL"],
    ["endsAt", "DATETIME(3) NULL"],
    ["priority", "INTEGER NOT NULL DEFAULT 0"],
    ["customerTarget", "VARCHAR(32) NOT NULL DEFAULT 'all'"],
    ["customerTags", "LONGTEXT NULL"],
    ["templateKey", "VARCHAR(64) NULL"],
    ["abTestEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["abTestVariant", "VARCHAR(32) NULL"],
    ["translations", "LONGTEXT NULL"],
    ["analyticsImpressions", "INTEGER NOT NULL DEFAULT 0"],
    ["analyticsConversions", "INTEGER NOT NULL DEFAULT 0"],
  ]);

  await ensureTableColumns("bxgyrule", [
    ["iconChoice", "VARCHAR(191) NULL DEFAULT 'sparkles'"],
    ["appliesCollectionIds", "LONGTEXT NULL"],
    ["appliesProductIds", "LONGTEXT NULL"],
    ["appliesStore", "BOOLEAN NOT NULL DEFAULT false"],
    ["buyxgetyId", "VARCHAR(255) NULL"],
    ["afterOfferUnlockMessage", "TEXT NULL"],
    ["beforeOfferUnlockMessage", "TEXT NULL"],
    ["campaignName", "VARCHAR(255) NULL"],
    ["status", "VARCHAR(32) NOT NULL DEFAULT 'draft'"],
    ["conditionType", "VARCHAR(64) NULL"],
    ["buyProductIds", "LONGTEXT NULL"],
    ["buyCollectionIds", "LONGTEXT NULL"],
    ["rewardProductIds", "LONGTEXT NULL"],
    ["minQuantity", "VARCHAR(255) NULL"],
    ["minSpend", "VARCHAR(255) NULL"],
    ["maxUsesPerOrder", "VARCHAR(255) NULL"],
    ["startsAt", "DATETIME(3) NULL"],
    ["endsAt", "DATETIME(3) NULL"],
    ["priority", "INTEGER NOT NULL DEFAULT 0"],
    ["customerTarget", "VARCHAR(32) NOT NULL DEFAULT 'all'"],
    ["customerTags", "LONGTEXT NULL"],
    ["templateKey", "VARCHAR(64) NULL"],
    ["abTestEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["abTestVariant", "VARCHAR(32) NULL"],
    ["translations", "LONGTEXT NULL"],
    ["analyticsImpressions", "INTEGER NOT NULL DEFAULT 0"],
    ["analyticsConversions", "INTEGER NOT NULL DEFAULT 0"],
  ]);

  await ensureTableColumns("cartgoalrule", [
    ["priority", "INTEGER NOT NULL DEFAULT 0"],
    ["customerTags", "LONGTEXT NULL"],
    ["targetingRules", "LONGTEXT NULL"],
    ["analyticsImpressions", "INTEGER NOT NULL DEFAULT 0"],
    ["analyticsConversions", "INTEGER NOT NULL DEFAULT 0"],
  ]);
};

const main = async () => {
  await ensureShopTable();
  await ensureColumn("firstName", "VARCHAR(255) NULL");
  await ensureColumn("lastName", "VARCHAR(255) NULL");
  await ensureColumn("name", "VARCHAR(255) NULL");
  await ensureColumn("ownerName", "VARCHAR(255) NULL");
  await ensureColumn("email", "VARCHAR(320) NULL");
  await ensureColumn("domain", "VARCHAR(255) NULL");
  await ensureColumn("contactNumber", "VARCHAR(50) NULL");
  await ensureColumn("phone", "VARCHAR(50) NULL");
  await ensureColumn("city", "VARCHAR(255) NULL");
  await ensureColumn("country", "VARCHAR(255) NULL");
  await ensureColumn("currency", "VARCHAR(10) NULL");
  await ensureColumn(
    "appStatus",
    "VARCHAR(20) NOT NULL DEFAULT 'active'",
  );
  await ensureColumn(
    "status",
    "VARCHAR(20) NOT NULL DEFAULT 'installed'",
  );
  await ensureColumn("reviewSubmittedAt", "DATETIME(3) NULL");
  await ensureColumn("reviewRating", "INTEGER NULL");
  await ensureColumn("reviewComment", "TEXT NULL");
  await ensureUniqueShopIndex();
  await ensureCampaignTables();
};

try {
  await main();
} catch (error) {
  const message = String(error?.message || error);
  const isDatabaseConnectionError =
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT");

  if (isDatabaseConnectionError) {
    console.error(
      "[bootstrap:shop] Could not connect to the database. Check DATABASE_URL, MySQL availability, firewall/IP allowlist, and that port 3306 is open from this host.",
    );
  } else {
    console.error("[bootstrap:shop] Failed:", error);
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
