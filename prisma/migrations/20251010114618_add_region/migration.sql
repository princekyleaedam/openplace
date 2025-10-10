/*
  Warnings:

  - Added the required column `lat` to the `Region` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lon` to the `Region` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Pixel` ADD COLUMN `regionCityId` INTEGER NULL,
    ADD COLUMN `regionCountryId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Region` ADD COLUMN `lat` DOUBLE NOT NULL,
    ADD COLUMN `lon` DOUBLE NOT NULL;

-- CreateIndex
CREATE INDEX `Pixel_regionCityId_idx` ON `Pixel`(`regionCityId`);

-- CreateIndex
CREATE INDEX `Pixel_regionCountryId_idx` ON `Pixel`(`regionCountryId`);
