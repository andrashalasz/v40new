-- CreateTable
CREATE TABLE `MobileSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `refreshTokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `platform` VARCHAR(191) NULL,
    `deviceName` VARCHAR(191) NULL,
    `appVersion` VARCHAR(191) NULL,
    `pushToken` VARCHAR(191) NULL,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MobileSession_refreshTokenHash_key`(`refreshTokenHash`),
    INDEX `MobileSession_userId_idx`(`userId`),
    INDEX `MobileSession_pushToken_idx`(`pushToken`),
    INDEX `MobileSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MobileSession` ADD CONSTRAINT `MobileSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
