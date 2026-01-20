-- CreateTable
CREATE TABLE `ShippingRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `rewardType` VARCHAR(191) NOT NULL,
    `rateType` VARCHAR(191) NULL,
    `amount` VARCHAR(191) NULL,
    `minSubtotal` VARCHAR(191) NULL,
    `method` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiscountRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `condition` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NULL,
    `minPurchase` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- CreateTable
CREATE TABLE `FreeGiftRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `minPurchase` VARCHAR(191) NULL,
    `bonusProduct` VARCHAR(191) NULL,
    `qty` VARCHAR(191) NULL,
    `limitPerOrder` VARCHAR(191) NULL,
    `replaceFreeLabel` BOOLEAN NOT NULL DEFAULT false,
    `excludeCOD` BOOLEAN NOT NULL DEFAULT false,
    `removeOnCOD` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BxgyRule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `xQty` VARCHAR(191) NOT NULL,
    `yQty` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `appliesTo` JSON NULL,
    `giftType` VARCHAR(191) NOT NULL,
    `giftSku` VARCHAR(191) NULL,
    `maxGifts` VARCHAR(191) NULL,
    `allowStacking` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GlobalSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `shippingMode` VARCHAR(191) NOT NULL,
    `giftOOS` VARCHAR(191) NOT NULL,
    `fallbackGiftSku` VARCHAR(191) NULL,
    `allowCOD` BOOLEAN NOT NULL DEFAULT false,
    `allowCouponStacking` BOOLEAN NOT NULL DEFAULT false,
    `nextRewardText` VARCHAR(191) NULL,
    `codNoticeText` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GlobalSettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StyleSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `font` VARCHAR(191) NOT NULL,
    `base` VARCHAR(191) NOT NULL,
    `headingScale` VARCHAR(191) NOT NULL,
    `radius` VARCHAR(191) NOT NULL,
    `textColor` VARCHAR(191) NOT NULL,
    `bg` VARCHAR(191) NOT NULL,
    `progress` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StyleSettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
