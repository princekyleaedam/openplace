-- AlterTable
ALTER TABLE `Tile` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `Pixel_season_tileX_tileY_idx` ON `Pixel`(`season`, `tileX`, `tileY`);
