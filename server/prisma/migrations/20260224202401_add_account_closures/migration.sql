-- AlterTable
ALTER TABLE "fact_cd_monthly_branch" ADD COLUMN     "cdClosed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "fact_sb_daily_branch" ADD COLUMN     "sbClosed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "account_closures" (
    "id" TEXT NOT NULL,
    "solId" TEXT NOT NULL,
    "cifId" TEXT NOT NULL,
    "foracid" TEXT NOT NULL,
    "acctName" TEXT NOT NULL,
    "schmType" TEXT NOT NULL,
    "schmCode" TEXT NOT NULL,
    "accountClass" TEXT,
    "acctOpnDate" TIMESTAMP(3) NOT NULL,
    "acctClsDate" TIMESTAMP(3) NOT NULL,
    "balanceAtCls" DECIMAL(18,2) NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "dataQualityFlag" TEXT NOT NULL DEFAULT 'VALID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_closures_foracid_key" ON "account_closures"("foracid");

-- CreateIndex
CREATE INDEX "account_closures_businessDate_idx" ON "account_closures"("businessDate");

-- CreateIndex
CREATE INDEX "account_closures_solId_idx" ON "account_closures"("solId");

-- AddForeignKey
ALTER TABLE "account_closures" ADD CONSTRAINT "account_closures_solId_fkey" FOREIGN KEY ("solId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
