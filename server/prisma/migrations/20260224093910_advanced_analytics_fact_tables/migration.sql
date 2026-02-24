-- AlterTable
ALTER TABLE "account_openings" ADD COLUMN     "accountClass" TEXT,
ADD COLUMN     "customerValueScore" DOUBLE PRECISION,
ADD COLUMN     "dataQualityFlag" TEXT NOT NULL DEFAULT 'VALID',
ADD COLUMN     "isQualified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "valueBucket" TEXT,
ADD COLUMN     "valueRank" INTEGER;

-- CreateTable
CREATE TABLE "calendar_master" (
    "calDate" TIMESTAMP(3) NOT NULL,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "holidayFlag" BOOLEAN NOT NULL DEFAULT false,
    "monthKey" TEXT NOT NULL,
    "financialPeriod" TEXT,

    CONSTRAINT "calendar_master_pkey" PRIMARY KEY ("calDate")
);

-- CreateTable
CREATE TABLE "fact_sb_daily_branch" (
    "id" TEXT NOT NULL,
    "solId" TEXT NOT NULL,
    "openDay" TIMESTAMP(3) NOT NULL,
    "netSbOpened" INTEGER NOT NULL,
    "workingDayFlag" BOOLEAN NOT NULL,
    "qualifiedCount" INTEGER NOT NULL,
    "dataQualityFlag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_sb_daily_branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_cd_monthly_branch" (
    "id" TEXT NOT NULL,
    "solId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "netCdOpened" INTEGER NOT NULL,
    "qualifiedCount" INTEGER NOT NULL,
    "dataQualityFlag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_cd_monthly_branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_adoption_schemes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_adoption_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fact_sb_daily_branch_solId_openDay_key" ON "fact_sb_daily_branch"("solId", "openDay");

-- CreateIndex
CREATE UNIQUE INDEX "fact_cd_monthly_branch_solId_monthKey_key" ON "fact_cd_monthly_branch"("solId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "product_adoption_schemes_code_key" ON "product_adoption_schemes"("code");
