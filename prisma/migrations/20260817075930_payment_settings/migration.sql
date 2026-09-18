-- AlterTable
ALTER TABLE `ClinicSettings` ADD COLUMN `cardGuaranteeEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'HUF',
    ADD COLUMN `invoiceAutoIssue` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `noShowFeePercent` INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN `onlinePaymentEnabled` BOOLEAN NOT NULL DEFAULT true;
