ALTER TABLE `discountrule`
  ADD COLUMN `quantityProgressTextBefore` TEXT NULL,
  ADD COLUMN `quantityProgressTextAfter` TEXT NULL;

ALTER TABLE `freegiftrule`
  ADD COLUMN `quantityProgressTextBefore` TEXT NULL,
  ADD COLUMN `quantityProgressTextAfter` TEXT NULL;
