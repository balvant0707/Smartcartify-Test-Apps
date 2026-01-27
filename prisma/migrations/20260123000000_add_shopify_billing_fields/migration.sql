-- Add Shopify billing fields to plansubscription and remove Stripe columns
ALTER TABLE `plansubscription`
  ADD COLUMN `billingInterval` VARCHAR(32) NULL,
  ADD COLUMN `billingAmount` DECIMAL(10,2) NULL,
  ADD COLUMN `billingCurrency` VARCHAR(10) NULL,
  ADD COLUMN `trialDays` INT NULL,
  ADD COLUMN `isTest` TINYINT(1) NULL,
  ADD COLUMN `subscriptionCreatedAt` DATETIME NULL,
  DROP COLUMN `stripeCustomerId`,
  DROP COLUMN `stripeSubscriptionId`,
  DROP COLUMN `stripePriceId`;
