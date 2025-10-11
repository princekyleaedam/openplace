/*
  Warnings:

  - You are about to drop the column `lat` on the `Region` table. All the data in the column will be lost.
  - You are about to drop the column `lon` on the `Region` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[latitude,longitude]` on the table `Region` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `latitude` to the `Region` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `Region` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Region` DROP COLUMN `lat`,
    DROP COLUMN `lon`,
    ADD COLUMN `latitude` DOUBLE NOT NULL,
    ADD COLUMN `longitude` DOUBLE NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Region_latitude_longitude_key` ON `Region`(`latitude`, `longitude`);
