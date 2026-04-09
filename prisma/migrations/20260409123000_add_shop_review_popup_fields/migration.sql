-- Add review popup persistence fields to shop table
ALTER TABLE `shop`
  ADD COLUMN `reviewSubmittedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewRating` INTEGER NULL,
  ADD COLUMN `reviewComment` TEXT NULL;
