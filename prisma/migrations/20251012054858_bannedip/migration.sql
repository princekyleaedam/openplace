-- CreateTable
CREATE TABLE `BannedIP` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cidr` VARCHAR(191) NOT NULL,
    `ipv4Min` INTEGER UNSIGNED NULL,
    `ipv4Max` INTEGER UNSIGNED NULL,
    `ipv6Min` LONGBLOB NULL,
    `ipv6Max` LONGBLOB NULL,
    `suspensionReason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BannedIP_cidr_key`(`cidr`),
    UNIQUE INDEX `BannedIP_ipv4Min_ipv4Max_key`(`ipv4Min`, `ipv4Max`),
    UNIQUE INDEX `BannedIP_ipv6Min_ipv6Max_key`(`ipv6Min`, `ipv6Max`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
