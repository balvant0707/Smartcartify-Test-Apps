-- AlterTable
ALTER TABLE `stylesettings` ADD COLUMN `announcementBarBackground` VARCHAR(191) NULL,
    ADD COLUMN `announcementBarEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `announcementBarTextColor` VARCHAR(191) NULL;
