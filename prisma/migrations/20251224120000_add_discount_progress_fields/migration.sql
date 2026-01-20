-- AlterTable
ALTER TABLE `discountrule`
  ADD COLUMN `progressTextBefore` TEXT NULL,
  ADD COLUMN `progressTextAfter` TEXT NULL,
  ADD COLUMN `progressTextBelow` TEXT NULL,
  ADD COLUMN `campaignName` VARCHAR(255) NULL,
  ADD COLUMN `cartStepName` VARCHAR(255) NULL;
