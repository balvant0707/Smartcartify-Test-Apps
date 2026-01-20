/*
  Warnings:

  - You are about to alter the column `checkoutButtonText` on the `stylesettings` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `stylesettings` MODIFY `checkoutButtonText` VARCHAR(191) NULL;
