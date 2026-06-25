ALTER TABLE `discountrule`
  ADD COLUMN `usageLimitEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `usageLimit` VARCHAR(255) NULL,
  ADD COLUMN `appliesOncePerCustomer` BOOLEAN NOT NULL DEFAULT false;
