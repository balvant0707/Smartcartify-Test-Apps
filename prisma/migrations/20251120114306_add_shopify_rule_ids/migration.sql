-- AlterTable
ALTER TABLE `bxgyrule` ADD COLUMN `shopifyPriceRuleId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `discountrule` ADD COLUMN `shopifyDiscountCodeId` VARCHAR(255) NULL,
    ADD COLUMN `shopifyPriceRuleId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `freegiftrule` ADD COLUMN `shopifyPriceRuleId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `shippingrule` ADD COLUMN `shopifyPriceRuleId` VARCHAR(255) NULL;
