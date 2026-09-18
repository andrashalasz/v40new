-- CreateTable
CREATE TABLE `CardGuarantee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointmentId` INTEGER NOT NULL,
    `provider` ENUM('BARION', 'SIMPLEPAY', 'STRIPE', 'MOCK', 'CASH', 'TRANSFER', 'HEALTH_FUND') NOT NULL DEFAULT 'STRIPE',
    `customerRef` VARCHAR(191) NULL,
    `setupIntentId` VARCHAR(191) NULL,
    `paymentMethodId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'CHARGED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `cardBrand` VARCHAR(191) NULL,
    `cardLast4` VARCHAR(191) NULL,
    `chargedPaymentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CardGuarantee_appointmentId_key`(`appointmentId`),
    UNIQUE INDEX `CardGuarantee_setupIntentId_key`(`setupIntentId`),
    INDEX `CardGuarantee_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CardGuarantee` ADD CONSTRAINT `CardGuarantee_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
