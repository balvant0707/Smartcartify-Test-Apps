-- MySQL / MariaDB compatible
CREATE TABLE `Session` (
  `id` varchar(191) NOT NULL,
  `shop` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `isOnline` boolean NOT NULL DEFAULT false,
  `scope` varchar(1024) NULL,
  `expires` datetime(3) NULL,
  `accessToken` longtext NOT NULL,
  `userId` bigint NULL,
  `firstName` varchar(255) NULL,
  `lastName` varchar(255) NULL,
  `email` varchar(320) NULL,
  `accountOwner` boolean NOT NULL DEFAULT false,
  `locale` varchar(32) NULL,
  `collaborator` boolean NULL DEFAULT false,
  `emailVerified` boolean NULL DEFAULT false,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Session_shop_idx` ON `Session`(`shop`);
