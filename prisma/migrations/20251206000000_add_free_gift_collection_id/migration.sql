-- Add column to store all-products collection ID per shop
ALTER TABLE `shop`
ADD COLUMN `freeGiftAllProductsCollectionId` VARCHAR(255) NULL AFTER `accessToken`;
