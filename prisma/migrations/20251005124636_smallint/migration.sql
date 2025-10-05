/*
  Warnings:

  - You are about to alter the column `season` on the `Pixel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `tileX` on the `Pixel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `tileY` on the `Pixel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `x` on the `Pixel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `y` on the `Pixel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `colorId` on the `Pixel` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `season` on the `Tile` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `x` on the `Tile` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.
  - You are about to alter the column `y` on the `Tile` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedSmallInt`.

*/
-- DropForeignKey
ALTER TABLE `Pixel` DROP FOREIGN KEY `Pixel_season_tileX_tileY_fkey`;

-- AlterTable
ALTER TABLE `Pixel` MODIFY `season` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    MODIFY `tileX` SMALLINT UNSIGNED NOT NULL,
    MODIFY `tileY` SMALLINT UNSIGNED NOT NULL,
    MODIFY `x` SMALLINT UNSIGNED NOT NULL,
    MODIFY `y` SMALLINT UNSIGNED NOT NULL,
    MODIFY `colorId` SMALLINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `Tile` MODIFY `season` SMALLINT UNSIGNED NOT NULL,
    MODIFY `x` SMALLINT UNSIGNED NOT NULL,
    MODIFY `y` SMALLINT UNSIGNED NOT NULL;

-- AddForeignKey
ALTER TABLE `Pixel` ADD CONSTRAINT `Pixel_season_tileX_tileY_fkey` FOREIGN KEY (`season`, `tileX`, `tileY`) REFERENCES `Tile`(`season`, `x`, `y`) ON DELETE RESTRICT ON UPDATE CASCADE;
