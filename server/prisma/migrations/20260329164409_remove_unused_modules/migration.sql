/*
  Warnings:

  - You are about to drop the `action_points` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_observations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `committee_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `committees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dispatch_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `legal_cases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `maintenance_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `meetings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recovery_actions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `regional_assets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "action_points" DROP CONSTRAINT "action_points_assignedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "action_points" DROP CONSTRAINT "action_points_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "audit_observations" DROP CONSTRAINT "audit_observations_branchId_fkey";

-- DropForeignKey
ALTER TABLE "committee_members" DROP CONSTRAINT "committee_members_committeeId_fkey";

-- DropForeignKey
ALTER TABLE "committee_members" DROP CONSTRAINT "committee_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_records" DROP CONSTRAINT "maintenance_records_assetId_fkey";

-- DropForeignKey
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_committeeId_fkey";

-- DropForeignKey
ALTER TABLE "recovery_actions" DROP CONSTRAINT "recovery_actions_branchId_fkey";

-- DropForeignKey
ALTER TABLE "regional_assets" DROP CONSTRAINT "regional_assets_branchId_fkey";

-- DropTable
DROP TABLE "action_points";

-- DropTable
DROP TABLE "audit_observations";

-- DropTable
DROP TABLE "committee_members";

-- DropTable
DROP TABLE "committees";

-- DropTable
DROP TABLE "dispatch_records";

-- DropTable
DROP TABLE "legal_cases";

-- DropTable
DROP TABLE "maintenance_records";

-- DropTable
DROP TABLE "meetings";

-- DropTable
DROP TABLE "recovery_actions";

-- DropTable
DROP TABLE "regional_assets";
