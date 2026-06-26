ALTER TABLE `upsellsettings`
  ADD COLUMN `analyticsImpressions` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `analyticsConversions` INTEGER NOT NULL DEFAULT 0;
