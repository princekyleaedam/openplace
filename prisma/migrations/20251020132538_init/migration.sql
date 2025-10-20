-- AlterTable
ALTER TABLE `profilepicture` MODIFY `url` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `allianceJoinedAt` DATETIME(3) NULL,
    ADD COLUMN `nickname` VARCHAR(191) NULL,
    MODIFY `picture` TEXT NULL;

-- CreateTable
CREATE TABLE `LeaderboardView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NULL,
    `regionId` INTEGER NULL,
    `rank` INTEGER NOT NULL,
    `pixelsPainted` INTEGER NOT NULL,
    `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeaderboardView_type_mode_rank_idx`(`type`, `mode`, `rank`),
    INDEX `LeaderboardView_type_mode_pixelsPainted_idx`(`type`, `mode`, `pixelsPainted`),
    INDEX `LeaderboardView_type_mode_regionId_idx`(`type`, `mode`, `regionId`),
    UNIQUE INDEX `LeaderboardView_type_mode_entityId_regionId_key`(`type`, `mode`, `entityId`, `regionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRegionStats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `regionCityId` INTEGER NULL,
    `regionCountryId` INTEGER NULL,
    `allianceId` INTEGER NULL,
    `timePeriod` DATETIME(3) NOT NULL,
    `pixelsPainted` INTEGER NOT NULL DEFAULT 0,
    `lastPaintedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserRegionStats_userId_idx`(`userId`),
    INDEX `UserRegionStats_regionCityId_idx`(`regionCityId`),
    INDEX `UserRegionStats_regionCountryId_idx`(`regionCountryId`),
    INDEX `UserRegionStats_allianceId_idx`(`allianceId`),
    INDEX `UserRegionStats_regionCityId_userId_idx`(`regionCityId`, `userId`),
    INDEX `UserRegionStats_regionCityId_allianceId_idx`(`regionCityId`, `allianceId`),
    UNIQUE INDEX `UserRegionStats_userId_regionCityId_regionCountryId_alliance_key`(`userId`, `regionCityId`, `regionCountryId`, `allianceId`, `timePeriod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRegionStatsDaily` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `regionCityId` INTEGER NULL,
    `regionCountryId` INTEGER NULL,
    `allianceId` INTEGER NULL,
    `date` DATETIME(3) NOT NULL,
    `pixelsPainted` INTEGER NOT NULL DEFAULT 0,
    `lastPaintedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserRegionStatsDaily_regionCityId_date_pixelsPainted_userId_idx`(`regionCityId`, `date`, `pixelsPainted`, `userId`),
    INDEX `UserRegionStatsDaily_regionCityId_date_pixelsPainted_allianc_idx`(`regionCityId`, `date`, `pixelsPainted`, `allianceId`),
    INDEX `UserRegionStatsDaily_regionCountryId_date_pixelsPainted_idx`(`regionCountryId`, `date`, `pixelsPainted`),
    UNIQUE INDEX `UserRegionStatsDaily_userId_regionCityId_regionCountryId_all_key`(`userId`, `regionCityId`, `regionCountryId`, `allianceId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRegionStats` ADD CONSTRAINT `UserRegionStats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRegionStatsDaily` ADD CONSTRAINT `UserRegionStatsDaily_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
