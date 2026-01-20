-- AlterTable
ALTER TABLE `stylesettings`
  ADD COLUMN `cartDrawerBackground` VARCHAR(255) NULL,
  ADD COLUMN `cartDrawerTextColor` VARCHAR(255) NULL,
  ADD COLUMN `cartDrawerHeaderColor` VARCHAR(255) NULL,
  ADD COLUMN `discountCodeApply` BOOLEAN NOT NULL DEFAULT false;
