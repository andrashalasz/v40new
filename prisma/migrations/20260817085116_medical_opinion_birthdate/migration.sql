-- AlterTable
ALTER TABLE `User` ADD COLUMN `birthDate` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `MedicalOpinion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentCode` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `authorId` INTEGER NULL,
    `appointmentId` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MedicalOpinion_documentCode_key`(`documentCode`),
    INDEX `MedicalOpinion_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MedicalOpinion` ADD CONSTRAINT `MedicalOpinion_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalOpinion` ADD CONSTRAINT `MedicalOpinion_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalOpinion` ADD CONSTRAINT `MedicalOpinion_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
