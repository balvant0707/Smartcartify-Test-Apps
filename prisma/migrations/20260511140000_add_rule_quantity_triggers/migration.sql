ALTER TABLE `discountrule`
  ADD COLUMN `triggerType` VARCHAR(32) NOT NULL DEFAULT 'amount',
  ADD COLUMN `minQuantity` VARCHAR(191) NULL;

ALTER TABLE `freegiftrule`
  ADD COLUMN `triggerType` VARCHAR(32) NOT NULL DEFAULT 'amount',
  ADD COLUMN `minQuantity` VARCHAR(191) NULL;
