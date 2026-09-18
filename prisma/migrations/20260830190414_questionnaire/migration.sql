-- CreateTable
CREATE TABLE `QuestionnaireResponse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `answers` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `QuestionnaireResponse_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `QuestionnaireResponse_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `QuestionnaireResponse` ADD CONSTRAINT `QuestionnaireResponse_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
