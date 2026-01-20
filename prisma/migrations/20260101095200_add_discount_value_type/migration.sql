/*
  Warnings:

  - A unique constraint covering the columns `[shop]` on the table `shop` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `bxgyrule` ADD COLUMN `campaignName` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `discountrule` ADD COLUMN `valueType` VARCHAR(191) NOT NULL DEFAULT 'percent';

-- CreateIndex
CREATE UNIQUE INDEX `shop_shop_key` ON `shop`(`shop`);
