-- CreateTable
CREATE TABLE `plansubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(255) NOT NULL,
    `planId` VARCHAR(255) NOT NULL,
    `planName` VARCHAR(255) NOT NULL,
    `status` VARCHAR(45) NOT NULL,
    `nextBillingDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `plansubscription_shop_idx`(`shop`),
    UNIQUE INDEX `plansubscription_shop_planId_key`(`shop`, `planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
