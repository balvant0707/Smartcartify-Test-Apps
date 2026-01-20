-- AlterTable
ALTER TABLE `bxgyrule` ADD COLUMN `appliesCollectionIds` JSON NULL,
    ADD COLUMN `appliesProductIds` JSON NULL,
    ADD COLUMN `appliesStore` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `freegiftrule` ADD COLUMN `bonusProductId` VARCHAR(255) NULL;
