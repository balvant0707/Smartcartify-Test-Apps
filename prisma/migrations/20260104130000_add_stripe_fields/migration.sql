ALTER TABLE `plansubscription`
  ADD COLUMN `stripeCustomerId` VARCHAR(255) NULL,
  ADD COLUMN `stripeSubscriptionId` VARCHAR(255) NULL,
  ADD COLUMN `stripePriceId` VARCHAR(255) NULL;
