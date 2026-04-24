/*
  Warnings:

  - You are about to alter the column `balanceAtCls` on the `account_closures` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `clrBalAmt` on the `account_openings` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `averageBalance` on the `account_openings` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `balance` on the `atms` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,4)`.
  - The primary key for the `branches` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `addressHi` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `addressTa` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `branches` table. All the data in the column will be lost.
  - You are about to alter the column `targetValue` on the `budget_history` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `targetValue` on the `budget_master` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `value` on the `campaign_daily_data` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,4)`.
  - You are about to alter the column `targetValue` on the `campaign_targets` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,4)`.
  - You are about to alter the column `targetValue` on the `campaigns` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,4)`.
  - You are about to drop the column `parameterId` on the `letters` table. All the data in the column will be lost.
  - You are about to alter the column `valueAtTime` on the `letters` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,4)`.
  - You are about to alter the column `budgetAtTime` on the `letters` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,4)`.
  - You are about to alter the column `value` on the `mis_facts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_fy_start` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_fy_end` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_prev_m_end` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_dby` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_y_eod` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_current` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `growth_day` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `growth_month` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `growth_fy` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `budget_month` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `gap_month` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `budget_quarter` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `gap_quarter` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `growth_prev_fy` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_prev_fy_end` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `val_prev_fy_start` on the `mis_information_panels` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `balance` on the `stg_account_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `sbBalance` on the `stg_account_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `cdBalance` on the `stg_account_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `tdBalance` on the `stg_account_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `advBalance` on the `stg_account_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `busBalance` on the `stg_account_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `casaBalance` on the `stg_account_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `sbBalance` on the `stg_unit_financials_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `cdBalance` on the `stg_unit_financials_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `tdBalance` on the `stg_unit_financials_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `advBalance` on the `stg_unit_financials_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to alter the column `outstanding` on the `stg_user_vertical_daily` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,4)`.
  - You are about to drop the `fact_cd_monthly_branch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fact_sb_daily_branch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `parameters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `snapshots` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "atms" DROP CONSTRAINT "atms_branchId_fkey";

-- DropForeignKey
ALTER TABLE "audit_observations" DROP CONSTRAINT "audit_observations_branchId_fkey";

-- DropForeignKey
ALTER TABLE "branch_history" DROP CONSTRAINT "branch_history_branchId_fkey";

-- DropForeignKey
ALTER TABLE "branch_requests" DROP CONSTRAINT "branch_requests_branchId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_daily_data" DROP CONSTRAINT "campaign_daily_data_branchId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_targets" DROP CONSTRAINT "campaign_targets_branchId_fkey";

-- DropForeignKey
ALTER TABLE "ingestion_logs" DROP CONSTRAINT "ingestion_logs_unitId_fkey";

-- DropForeignKey
ALTER TABLE "letters" DROP CONSTRAINT "letters_branchId_fkey";

-- DropForeignKey
ALTER TABLE "letters" DROP CONSTRAINT "letters_parameterId_fkey";

-- DropForeignKey
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_committeeId_fkey";

-- DropForeignKey
ALTER TABLE "mis_exceptions" DROP CONSTRAINT "mis_exceptions_unitId_fkey";

-- DropForeignKey
ALTER TABLE "mis_facts" DROP CONSTRAINT "mis_facts_unitId_fkey";

-- DropForeignKey
ALTER TABLE "mis_snapshots" DROP CONSTRAINT "mis_snapshots_unitId_fkey";

-- DropForeignKey
ALTER TABLE "notice_acknowledgements" DROP CONSTRAINT "notice_acknowledgements_branchId_fkey";

-- DropForeignKey
ALTER TABLE "notices" DROP CONSTRAINT "notices_branchId_fkey";

-- DropForeignKey
ALTER TABLE "posting_history" DROP CONSTRAINT "posting_history_branchId_fkey";

-- DropForeignKey
ALTER TABLE "recovery_actions" DROP CONSTRAINT "recovery_actions_branchId_fkey";

-- DropForeignKey
ALTER TABLE "regional_assets" DROP CONSTRAINT "regional_assets_branchId_fkey";

-- DropForeignKey
ALTER TABLE "snapshots" DROP CONSTRAINT "snapshots_branchId_fkey";

-- DropForeignKey
ALTER TABLE "snapshots" DROP CONSTRAINT "snapshots_parameterId_fkey";

-- DropForeignKey
ALTER TABLE "stationery_movements" DROP CONSTRAINT "stationery_movements_branchId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_branchId_fkey";

-- DropIndex
DROP INDEX "branches_code_key";

-- AlterTable
ALTER TABLE "account_closures" ALTER COLUMN "balanceAtCls" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "account_openings" ALTER COLUMN "clrBalAmt" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "averageBalance" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "atms" ADD COLUMN     "deviceType" TEXT NOT NULL DEFAULT 'ATM',
ADD COLUMN     "locationType" TEXT NOT NULL DEFAULT 'ONSITE',
ADD COLUMN     "managementType" TEXT NOT NULL DEFAULT 'BRANCH_MANAGED',
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "branches" DROP CONSTRAINT "branches_pkey",
DROP COLUMN "address",
DROP COLUMN "addressHi",
DROP COLUMN "addressTa",
DROP COLUMN "district",
DROP COLUMN "id",
ADD COLUMN     "address1En" TEXT,
ADD COLUMN     "address1Hi" TEXT,
ADD COLUMN     "address1Ta" TEXT,
ADD COLUMN     "address2En" TEXT,
ADD COLUMN     "address2Hi" TEXT,
ADD COLUMN     "address2Ta" TEXT,
ADD COLUMN     "bsrCode" TEXT,
ADD COLUMN     "districtEn" TEXT,
ADD COLUMN     "districtHi" TEXT,
ADD COLUMN     "districtTa" TEXT,
ADD COLUMN     "micr" TEXT,
ADD COLUMN     "parentCode" TEXT,
ADD COLUMN     "prevRiskCategory" TEXT,
ADD COLUMN     "size" TEXT,
ALTER COLUMN "type" SET DEFAULT 'BRANCH',
ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("code");

-- AlterTable
ALTER TABLE "budget_history" ALTER COLUMN "targetValue" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "budget_master" ALTER COLUMN "targetValue" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "campaign_daily_data" ALTER COLUMN "value" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "campaign_targets" ALTER COLUMN "targetValue" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "campaigns" ALTER COLUMN "targetValue" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "letters" DROP COLUMN "parameterId",
ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "signatoryId" TEXT,
ALTER COLUMN "valueAtTime" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "budgetAtTime" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "attendees" JSONB,
ADD COLUMN     "signatories" JSONB,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "committeeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "mis_facts" ALTER COLUMN "value" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "mis_information_panels" ALTER COLUMN "val_fy_start" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "val_fy_end" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "val_prev_m_end" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "val_dby" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "val_y_eod" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "val_current" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "growth_day" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "growth_month" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "growth_fy" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "budget_month" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "gap_month" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "budget_quarter" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "gap_quarter" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "growth_prev_fy" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "val_prev_fy_end" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "val_prev_fy_start" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "posting_history" ADD COLUMN     "gradeId" TEXT;

-- AlterTable
ALTER TABLE "stg_account_daily" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "sbBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "cdBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "tdBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "advBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "busBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "casaBalance" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "stg_unit_financials_daily" ALTER COLUMN "sbBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "cdBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "tdBalance" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "advBalance" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "stg_user_vertical_daily" ALTER COLUMN "outstanding" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gradeId" TEXT;

-- DropTable
DROP TABLE "fact_cd_monthly_branch";

-- DropTable
DROP TABLE "fact_sb_daily_branch";

-- DropTable
DROP TABLE "parameters";

-- DropTable
DROP TABLE "snapshots";

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seniorityLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_partners" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'JEWEL_APPRAISER',
    "nameEn" TEXT NOT NULL,
    "nameTa" TEXT,
    "nameHi" TEXT,
    "registrationNo" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lockers" (
    "id" TEXT NOT NULL,
    "lockerNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_manuals" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleTa" TEXT,
    "titleHi" TEXT,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_manuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_activities" (
    "id" TEXT NOT NULL,
    "manualId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleTa" TEXT,
    "titleHi" TEXT,
    "description" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "dueDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_visits" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "visitorCategory" TEXT NOT NULL DEFAULT 'SECOND_LINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "letterIssued" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,

    CONSTRAINT "branch_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_records" (
    "id" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "letterId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grades_code_key" ON "grades"("code");

-- CreateIndex
CREATE UNIQUE INDEX "service_partners_registrationNo_key" ON "service_partners"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "lockers_branchId_lockerNo_key" ON "lockers"("branchId", "lockerNo");

-- CreateIndex
CREATE UNIQUE INDEX "generation_records_payloadHash_key" ON "generation_records"("payloadHash");

-- CreateIndex
CREATE INDEX "generation_records_payloadHash_idx" ON "generation_records"("payloadHash");

-- CreateIndex
CREATE INDEX "generation_records_letterId_idx" ON "generation_records"("letterId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "branches"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_history" ADD CONSTRAINT "branch_history_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_signatoryId_fkey" FOREIGN KEY ("signatoryId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_requests" ADD CONSTRAINT "branch_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_acknowledgements" ADD CONSTRAINT "notice_acknowledgements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_partners" ADD CONSTRAINT "service_partners_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stationery_movements" ADD CONSTRAINT "stationery_movements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atms" ADD CONSTRAINT "atms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_history" ADD CONSTRAINT "posting_history_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_history" ADD CONSTRAINT "posting_history_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_logs" ADD CONSTRAINT "ingestion_logs_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_facts" ADD CONSTRAINT "mis_facts_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_snapshots" ADD CONSTRAINT "mis_snapshots_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_information_panels" ADD CONSTRAINT "mis_information_panels_parameter_fkey" FOREIGN KEY ("parameter") REFERENCES "mis_parameter_registry"("parameterName") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_exceptions" ADD CONSTRAINT "mis_exceptions_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_observations" ADD CONSTRAINT "audit_observations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_assets" ADD CONSTRAINT "regional_assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_daily_data" ADD CONSTRAINT "campaign_daily_data_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_manuals" ADD CONSTRAINT "department_manuals_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_activities" ADD CONSTRAINT "department_activities_manualId_fkey" FOREIGN KEY ("manualId") REFERENCES "department_manuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_visits" ADD CONSTRAINT "branch_visits_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_visits" ADD CONSTRAINT "branch_visits_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
