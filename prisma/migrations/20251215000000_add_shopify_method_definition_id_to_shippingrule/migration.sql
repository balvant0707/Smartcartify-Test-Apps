-- Add Shopify method definition ID tracking to shipping rules
ALTER TABLE shippingrule
  ADD COLUMN shopifyMethodDefinitionId VARCHAR(255) NULL AFTER shopifyRateId;
