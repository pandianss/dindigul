/*
  Warnings:

  - A unique constraint covering the columns `[referenceNo]` on the table `letters` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referenceNo]` on the table `office_notes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "mis_exceptions" DROP CONSTRAINT "mis_exceptions_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "mis_facts" DROP CONSTRAINT "mis_facts_ingestionId_fkey";

-- DropForeignKey
ALTER TABLE "mis_information_panels" DROP CONSTRAINT "mis_information_panels_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE "notice_acknowledgements" DROP CONSTRAINT "notice_acknowledgements_noticeId_fkey";

-- DropIndex
DROP INDEX "holidays_date_key";

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "addressHi" TEXT,
ADD COLUMN     "addressTa" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "budget_history" ADD COLUMN     "effectiveDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "budget_import_logs" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PROCESSING';

-- AlterTable
ALTER TABLE "budget_master" ADD COLUMN     "effectiveDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "dashboard_tickers" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "linkUrl" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "sealPath" TEXT;

-- AlterTable
ALTER TABLE "holidays" ADD COLUMN     "venue" TEXT;

-- AlterTable
ALTER TABLE "ingestion_logs" ADD COLUMN     "importLogId" TEXT;

-- AlterTable
ALTER TABLE "letters" ADD COLUMN     "orgMeta" JSONB,
ADD COLUMN     "referenceNo" TEXT,
ADD COLUMN     "scannedCopyUrl" TEXT;

-- AlterTable
ALTER TABLE "mis_information_panels" ADD COLUMN     "budget_quarter" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gap_quarter" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "growth_prev_fy" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Neutral',
ADD COLUMN     "val_prev_fy_end" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "val_prev_fy_start" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "mis_parameter_registry" ADD COLUMN     "description" TEXT,
ADD COLUMN     "fullForm" TEXT,
ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentParameterName" TEXT;

-- AlterTable
ALTER TABLE "notices" ADD COLUMN     "contentHi" TEXT,
ADD COLUMN     "photoId" TEXT,
ADD COLUMN     "titleHi" TEXT;

-- AlterTable
ALTER TABLE "office_notes" ADD COLUMN     "referenceNo" TEXT,
ADD COLUMN     "scannedCopyUrl" TEXT;

-- AlterTable
ALTER TABLE "srm_messages" ADD COLUMN     "nameHi" TEXT,
ADD COLUMN     "nameTa" TEXT,
ADD COLUMN     "regionHi" TEXT,
ADD COLUMN     "regionTa" TEXT,
ADD COLUMN     "titleHi" TEXT,
ADD COLUMN     "titleTa" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "designationEn" TEXT,
ADD COLUMN     "designationHi" TEXT,
ADD COLUMN     "designationTa" TEXT,
ADD COLUMN     "gender" TEXT NOT NULL DEFAULT 'M',
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT;

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "osUsername" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "bankNameEn" TEXT NOT NULL,
    "bankNameTa" TEXT,
    "bankNameHi" TEXT,
    "signingAuthEn" TEXT NOT NULL,
    "signingAuthTa" TEXT,
    "signingAuthHi" TEXT,
    "signatoryName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mis_import_logs" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "processedUnits" INTEGER NOT NULL,
    "failedUnits" INTEGER NOT NULL,
    "uniqueDates" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mis_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_notes" (
    "id" TEXT NOT NULL,
    "refNo" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentHi" TEXT,
    "departmentTa" TEXT,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presentation_decks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataDate" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "slides" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presentation_decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_sequences" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "login_audit_logs_userId_idx" ON "login_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "login_audit_logs_event_idx" ON "login_audit_logs"("event");

-- CreateIndex
CREATE INDEX "login_audit_logs_createdAt_idx" ON "login_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reference_sequences_category_prefix_key" ON "reference_sequences"("category", "prefix");

-- CreateIndex
CREATE UNIQUE INDEX "letters_referenceNo_key" ON "letters"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "office_notes_referenceNo_key" ON "office_notes"("referenceNo");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_audit_logs" ADD CONSTRAINT "login_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_acknowledgements" ADD CONSTRAINT "notice_acknowledgements_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_logs" ADD CONSTRAINT "ingestion_logs_importLogId_fkey" FOREIGN KEY ("importLogId") REFERENCES "mis_import_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_facts" ADD CONSTRAINT "mis_facts_ingestionId_fkey" FOREIGN KEY ("ingestionId") REFERENCES "ingestion_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_information_panels" ADD CONSTRAINT "mis_information_panels_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "mis_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_exceptions" ADD CONSTRAINT "mis_exceptions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "mis_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_parameter_registry" ADD CONSTRAINT "mis_parameter_registry_parentParameterName_fkey" FOREIGN KEY ("parentParameterName") REFERENCES "mis_parameter_registry"("parameterName") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_decks" ADD CONSTRAINT "presentation_decks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
