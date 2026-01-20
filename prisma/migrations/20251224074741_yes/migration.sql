/*
  Warnings:

  - You are about to alter the column `cartDrawerBackground` on the `stylesettings` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `cartDrawerTextColor` on the `stylesettings` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `cartDrawerHeaderColor` on the `stylesettings` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `cartDrawerImage` on the `stylesettings` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `stylesettings` MODIFY `cartDrawerBackground` VARCHAR(191) NULL,
    MODIFY `cartDrawerTextColor` VARCHAR(191) NULL,
    MODIFY `cartDrawerHeaderColor` VARCHAR(191) NULL,
    MODIFY `cartDrawerImage` VARCHAR(191) NULL,
    MODIFY `cartDrawerBackgroundMode` VARCHAR(191) NOT NULL DEFAULT 'color',
    MODIFY `progressTextBefore` VARCHAR(191) NULL,
    MODIFY `progressTextAfter` VARCHAR(191) NULL,
    MODIFY `progressTextBelow` VARCHAR(191) NULL;
