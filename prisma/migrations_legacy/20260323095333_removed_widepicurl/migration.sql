/*
  Warnings:

  - You are about to drop the column `cardPicUrl` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `widePicUrl` on the `Blog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Blog` DROP COLUMN `cardPicUrl`,
    DROP COLUMN `widePicUrl`,
    ADD COLUMN `picUrl` VARCHAR(191) NULL;
