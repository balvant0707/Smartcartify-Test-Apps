-- Add Shopify delivery rate ID tracking to shipping rules
ALTER TABLE `shippingrule`
  ADD COLUMN `shopifyRateId` VARCHAR(255) NULL AFTER `iconChoice`;
