-- Track min-amount free gift automatic discount id
ALTER TABLE `freegiftrule`
ADD COLUMN `minAmountFreeGiftDiscountId` VARCHAR(255) NULL AFTER `freeProductDiscountID`;
