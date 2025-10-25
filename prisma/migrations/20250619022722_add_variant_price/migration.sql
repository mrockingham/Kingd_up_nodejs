/*
  Warnings:

  - Added the required column `price` to the `Variant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Variant" ADD COLUMN "price" DOUBLE PRECISION NOT NULL DEFAULT 0;
