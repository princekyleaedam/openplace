/*
  Warnings:

  - A unique constraint covering the columns `[verified]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `verified` BOOLEAN NOT NULL DEFAULT 0;
