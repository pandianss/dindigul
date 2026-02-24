-- AlterTable
ALTER TABLE "branch_requests" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "slaBreached" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "account_openings" (
    "id" TEXT NOT NULL,
    "solId" TEXT NOT NULL,
    "cifId" TEXT NOT NULL,
    "foracid" TEXT NOT NULL,
    "acctName" TEXT NOT NULL,
    "schmType" TEXT NOT NULL,
    "schmCode" TEXT NOT NULL,
    "acctOpnDate" TIMESTAMP(3) NOT NULL,
    "clrBalAmt" DECIMAL(18,2) NOT NULL,
    "averageBalance" DECIMAL(18,2) NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'STRING',
    "group" TEXT NOT NULL DEFAULT 'GENERAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_openings_foracid_key" ON "account_openings"("foracid");

-- CreateIndex
CREATE INDEX "account_openings_businessDate_idx" ON "account_openings"("businessDate");

-- CreateIndex
CREATE INDEX "account_openings_solId_idx" ON "account_openings"("solId");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- AddForeignKey
ALTER TABLE "account_openings" ADD CONSTRAINT "account_openings_solId_fkey" FOREIGN KEY ("solId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
