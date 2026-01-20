-- AlterTable
ALTER TABLE `session` MODIFY `accessToken` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `Shop` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(255) NOT NULL,
    `accessToken` TEXT NULL,
    `installed` BOOLEAN NOT NULL DEFAULT false,
    `uninstalledAt` DATETIME(3) NULL,
    `onboardedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Shop_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
