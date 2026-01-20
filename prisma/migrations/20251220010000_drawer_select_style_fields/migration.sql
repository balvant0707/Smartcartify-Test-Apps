-- AlterTable
ALTER TABLE `stylesettings`
  ADD COLUMN `cartDrawerImage` VARCHAR(255) NULL,
  ADD COLUMN `cartDrawerBackgroundMode` VARCHAR(20) NOT NULL DEFAULT 'color';
