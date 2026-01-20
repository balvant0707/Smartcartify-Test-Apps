/*
  Warnings:

  - You are about to drop the column `nextBillingDate` on the `plansubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shop]` on the table `plansubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `plansubscription_shop_idx` ON `plansubscription`;

-- DropIndex
DROP INDEX `plansubscription_shop_planId_key` ON `plansubscription`;

-- AlterTable
ALTER TABLE `plansubscription` DROP COLUMN `nextBillingDate`,
    ADD COLUMN `currentPeriodEnd` DATETIME(3) NULL,
    ADD COLUMN `shopifySubGid` VARCHAR(191) NULL,
    MODIFY `planId` VARCHAR(255) NULL,
    MODIFY `planName` VARCHAR(255) NULL,
    MODIFY `status` VARCHAR(45) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `plansubscription_shop_key` ON `plansubscription`(`shop`);
