-- CreateTable
CREATE TABLE `HealthConsent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `platform` VARCHAR(191) NULL,

    INDEX `HealthConsent_userId_idx`(`userId`),
    UNIQUE INDEX `HealthConsent_userId_category_key`(`userId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthDailyMetric` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `metric` VARCHAR(191) NOT NULL,
    `day` DATE NOT NULL,
    `sum` DOUBLE NULL,
    `avg` DOUBLE NULL,
    `min` DOUBLE NULL,
    `max` DOUBLE NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `syncedAt` DATETIME(3) NOT NULL,

    INDEX `HealthDailyMetric_userId_day_idx`(`userId`, `day`),
    INDEX `HealthDailyMetric_userId_metric_day_idx`(`userId`, `metric`, `day`),
    UNIQUE INDEX `HealthDailyMetric_userId_metric_day_key`(`userId`, `metric`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthSyncState` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `lastSyncedDay` DATE NULL,
    `lastSyncAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HealthSyncState_userId_platform_key`(`userId`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HealthConsent` ADD CONSTRAINT `HealthConsent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthDailyMetric` ADD CONSTRAINT `HealthDailyMetric_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthSyncState` ADD CONSTRAINT `HealthSyncState_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
