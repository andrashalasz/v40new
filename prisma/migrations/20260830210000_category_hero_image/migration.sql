-- Kategória felugró-illusztráció (korábban db push-sal ment; itt migrációként rögzítve)
ALTER TABLE `ServiceCategory` ADD COLUMN `heroImage` VARCHAR(191) NULL;
