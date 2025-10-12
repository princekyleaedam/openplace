-- AlterTable
ALTER TABLE `BannedIP` ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `User_banned_idx` ON `User`(`banned`);

-- CreateIndex
CREATE INDEX `User_registrationIP_idx` ON `User`(`registrationIP`);

-- CreateIndex
CREATE INDEX `User_lastIP_idx` ON `User`(`lastIP`);

-- AddForeignKey
ALTER TABLE `BannedIP` ADD CONSTRAINT `BannedIP_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
