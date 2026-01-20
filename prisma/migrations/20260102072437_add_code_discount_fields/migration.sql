-- AlterTable
ALTER TABLE `discountrule` ADD COLUMN `appliesTo` JSON NULL,
    ADD COLUMN `codeDiscountId` VARCHAR(255) NULL,
    ADD COLUMN `condition` VARCHAR(255) NULL,
    ADD COLUMN `rewardType` VARCHAR(191) NOT NULL DEFAULT 'percent',
    ADD COLUMN `scope` VARCHAR(255) NULL;
