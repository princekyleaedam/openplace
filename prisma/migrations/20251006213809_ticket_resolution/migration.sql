/*
  Warnings:

  - You are about to drop the column `resolved` on the `Ticket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Ticket` DROP COLUMN `resolved`,
    ADD COLUMN `moderatorUserId` INTEGER NULL,
    ADD COLUMN `resolution` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_moderatorUserId_fkey` FOREIGN KEY (`moderatorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
