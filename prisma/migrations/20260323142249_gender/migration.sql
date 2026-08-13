/*
  Warnings:

  - You are about to drop the column `bookable` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `consultacy` on the `Product` table. All the data in the column will be lost.
  - Added the required column `gender` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Product` DROP COLUMN `bookable`,
    DROP COLUMN `consultacy`,
    ADD COLUMN `gender` VARCHAR(191) NOT NULL;
