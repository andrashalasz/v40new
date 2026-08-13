/*
  Warnings:

  - Added the required column `picUrl` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Product` ADD COLUMN `picUrl` VARCHAR(191) NOT NULL;
