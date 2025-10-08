-- AlterTable
ALTER TABLE `Tile` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `suspensionReason` VARCHAR(191) NULL;
