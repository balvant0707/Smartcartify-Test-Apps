-- AlterTable
ALTER TABLE `bxgyrule` ADD COLUMN `iconChoice` VARCHAR(191) NULL DEFAULT 'sparkles';

-- AlterTable
ALTER TABLE `discountrule` ADD COLUMN `iconChoice` VARCHAR(191) NULL DEFAULT 'tag';

-- AlterTable
ALTER TABLE `freegiftrule` ADD COLUMN `iconChoice` VARCHAR(191) NULL DEFAULT 'gift';

-- AlterTable
ALTER TABLE `shippingrule` ADD COLUMN `iconChoice` VARCHAR(191) NULL DEFAULT 'truck';
