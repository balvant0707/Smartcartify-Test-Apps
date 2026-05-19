-- Add Shopify billing fields to plansubscription.
-- The previous version also tried to drop Stripe columns that are not created
-- anywhere in this migration history, which fails on existing databases.
ALTER TABLE `plansubscription`
  ADD COLUMN `billingInterval` VARCHAR(32) NULL,
  ADD COLUMN `billingAmount` DECIMAL(10,2) NULL,
  ADD COLUMN `billingCurrency` VARCHAR(10) NULL,
  ADD COLUMN `trialDays` INT NULL,
  ADD COLUMN `isTest` TINYINT(1) NULL,
  ADD COLUMN `subscriptionCreatedAt` DATETIME NULL;
