-- Migration: add_campaign_table
-- Created: 2026-05-19
-- Adds the unified Campaign table used as the master registry for all campaign types.

CREATE TABLE IF NOT EXISTS `campaign` (
  `id`                  INT           NOT NULL AUTO_INCREMENT,
  `shop`                VARCHAR(255)  NOT NULL,
  `type`                VARCHAR(64)   NOT NULL,
  `name`                VARCHAR(255)  NOT NULL,
  `status`              VARCHAR(20)   NOT NULL DEFAULT 'draft',
  `settings`            LONGTEXT      NOT NULL,
  `shopifyDiscountId`   VARCHAR(255)  NULL,
  `shopifyDiscountCode` VARCHAR(255)  NULL,
  `startsAt`            DATETIME(3)   NULL,
  `endsAt`              DATETIME(3)   NULL,
  `createdAt`           DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)   NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `campaign_shop_idx` (`shop`),
  INDEX `campaign_shop_type_idx` (`shop`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
