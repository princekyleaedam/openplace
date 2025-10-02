/*
  Warnings:

  - A unique constraint covering the columns `[season,tileX,tileY,x,y]` on the table `Pixel` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[season,x,y]` on the table `Tile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Pixel` DROP FOREIGN KEY `Pixel_tileX_tileY_fkey`;

-- DropIndex
DROP INDEX `Pixel_season_tileX_tileY_idx` ON `Pixel`;

-- DropIndex
DROP INDEX `Pixel_tileX_tileY_x_y_key` ON `Pixel`;

-- DropIndex
DROP INDEX `Tile_season_x_y_idx` ON `Tile`;

-- DropIndex
DROP INDEX `Tile_x_y_key` ON `Tile`;

-- CreateIndex
CREATE UNIQUE INDEX `Pixel_season_tileX_tileY_x_y_key` ON `Pixel`(`season`, `tileX`, `tileY`, `x`, `y`);

-- CreateIndex
CREATE UNIQUE INDEX `Tile_season_x_y_key` ON `Tile`(`season`, `x`, `y`);

-- AddForeignKey
ALTER TABLE `Pixel` ADD CONSTRAINT `Pixel_season_tileX_tileY_fkey` FOREIGN KEY (`season`, `tileX`, `tileY`) REFERENCES `Tile`(`season`, `x`, `y`) ON DELETE RESTRICT ON UPDATE CASCADE;
