/*
  Warnings:

  - You are about to drop the column `excludeCOD` on the `freegiftrule` table. All the data in the column will be lost.
  - You are about to drop the column `removeOnCOD` on the `freegiftrule` table. All the data in the column will be lost.
  - You are about to drop the column `replaceFreeLabel` on the `freegiftrule` table. All the data in the column will be lost.
  - You are about to drop the column `shopifyPriceRuleId` on the `freegiftrule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `freegiftrule` DROP COLUMN `excludeCOD`,
    DROP COLUMN `removeOnCOD`,
    DROP COLUMN `replaceFreeLabel`,
    DROP COLUMN `shopifyPriceRuleId`,
    ADD COLUMN `freeProductDiscountID` VARCHAR(255) NULL;
