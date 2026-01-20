-- Remove Shopify-specific identifier columns from ShippingRule
ALTER TABLE shippingrule
  DROP COLUMN shopifyPriceRuleId,
  DROP COLUMN shopifyDiscountId;
