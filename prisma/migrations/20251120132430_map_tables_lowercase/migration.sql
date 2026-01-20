DROP INDEX `Session_shop_idx` ON `session`;
CREATE INDEX `session_shop_idx` ON `session`(`shop`);
