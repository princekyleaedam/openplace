/*
  Warnings:

  - You are about to alter the column `ipv6Min` on the `BannedIP` table. The data in that column could be lost. The data in that column will be cast from `LongBlob` to `Binary(16)`.
  - You are about to alter the column `ipv6Max` on the `BannedIP` table. The data in that column could be lost. The data in that column will be cast from `LongBlob` to `Binary(16)`.

*/
-- DropIndex
DROP INDEX `BannedIP_cidr_key` ON `BannedIP`;

-- DropIndex
DROP INDEX `BannedIP_ipv4Min_ipv4Max_key` ON `BannedIP`;

-- DropIndex
DROP INDEX `BannedIP_ipv6Min_ipv6Max_key` ON `BannedIP`;

-- AlterTable
ALTER TABLE `BannedIP` MODIFY `ipv6Min` BINARY(16) NULL,
    MODIFY `ipv6Max` BINARY(16) NULL;

-- CreateIndex
CREATE INDEX `BannedIP_cidr_idx` ON `BannedIP`(`cidr`);

-- CreateIndex
CREATE INDEX `BannedIP_ipv4Min_ipv4Max_idx` ON `BannedIP`(`ipv4Min`, `ipv4Max`);

-- CreateIndex
CREATE INDEX `BannedIP_ipv6Min_ipv6Max_idx` ON `BannedIP`(`ipv6Min`, `ipv6Max`);
