import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const readCount = async (sql) => {
  const rows = await prisma.$queryRawUnsafe(sql);
  const first = Array.isArray(rows) ? rows[0] : null;
  const value = first ? Object.values(first)[0] : 0;
  return Number(value || 0);
};

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

const ensureShopTable = async () => {
  const lowercaseExists = await tableExists("shop");
  const uppercaseExists = await tableExists("Shop");

  if (!lowercaseExists && uppercaseExists) {
    await prisma.$executeRawUnsafe("RENAME TABLE `Shop` TO `shop`");
    console.log("[bootstrap:shop] Renamed `Shop` to `shop`.");
    return;
  }

  if (!lowercaseExists && !uppercaseExists) {
    await prisma.$executeRawUnsafe(`
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
        \`email\` VARCHAR(320) NULL,
        \`domain\` VARCHAR(255) NULL,
        \`contactNumber\` VARCHAR(50) NULL,
        \`appStatus\` VARCHAR(20) NOT NULL DEFAULT 'active',
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`shop_shop_key\` (\`shop\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log("[bootstrap:shop] Created missing `shop` table.");
  }
};

const ensureColumn = async (columnName, definition) => {
  const exists = await columnExists(columnName);
  if (exists) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`shop\` ADD COLUMN \`${columnName}\` ${definition}`,
  );
  console.log(`[bootstrap:shop] Added missing column \`${columnName}\`.`);
};

const ensureUniqueShopIndex = async () => {
  const hasUniqueIndex = await uniqueShopIndexExists();
  if (hasUniqueIndex) return;

  await prisma.$executeRawUnsafe(`
    DELETE s1 FROM \`shop\` s1
    INNER JOIN \`shop\` s2
      ON s1.shop = s2.shop AND s1.id < s2.id
  `);
  await prisma.$executeRawUnsafe(
    "CREATE UNIQUE INDEX `shop_shop_key` ON `shop`(`shop`)",
  );
  console.log("[bootstrap:shop] Restored unique index on `shop.shop`.");
};

const main = async () => {
  await ensureShopTable();
  await ensureColumn("firstName", "VARCHAR(255) NULL");
  await ensureColumn("lastName", "VARCHAR(255) NULL");
  await ensureColumn("email", "VARCHAR(320) NULL");
  await ensureColumn("domain", "VARCHAR(255) NULL");
  await ensureColumn("contactNumber", "VARCHAR(50) NULL");
  await ensureColumn(
    "appStatus",
    "VARCHAR(20) NOT NULL DEFAULT 'active'",
  );
  await ensureUniqueShopIndex();
};

try {
  await main();
} finally {
  await prisma.$disconnect();
}

