/*
  Warnings:

  - You are about to drop the column `data` on the `photos` table. All the data in the column will be lost.
  - Added the required column `photoUrl` to the `photos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "photos" DROP COLUMN "data",
ADD COLUMN     "photoUrl" TEXT NOT NULL;
