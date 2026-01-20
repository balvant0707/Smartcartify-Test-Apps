-- Track Shopify shipping rate created for minimum amount free gift
ALTER TABLE `freegiftrule`
ADD COLUMN `minAmountShippingRateId` VARCHAR(255) NULL AFTER `minAmountFreeGiftDiscountId`;
