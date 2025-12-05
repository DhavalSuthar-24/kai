/*
  Warnings:

  - You are about to drop the column `search_vector` on the `Capture` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_capture_search";

-- AlterTable
ALTER TABLE "Capture" DROP COLUMN "search_vector";
