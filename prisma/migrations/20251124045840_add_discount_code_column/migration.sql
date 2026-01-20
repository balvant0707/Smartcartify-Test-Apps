/*
  Warnings:

  - You are about to drop the column `condition` on the `discountrule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `session_shop_idx` ON `session`;

-- AlterTable
ALTER TABLE `discountrule` DROP COLUMN `condition`,
    ADD COLUMN `discountCode` VARCHAR(255) NULL;
