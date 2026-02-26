-- CreateTable
CREATE TABLE "budget_master" (
    "id" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "solId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "targetValue" DECIMAL(18,2) NOT NULL,
    "versionNo" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceBatchId" TEXT NOT NULL,

    CONSTRAINT "budget_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_history" (
    "id" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "solId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "targetValue" DECIMAL(18,2) NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "sourceBatchId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mis_parameter_registry" (
    "parameterName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdFromBudgetFlag" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mis_parameter_registry_pkey" PRIMARY KEY ("parameterName")
);

-- CreateTable
CREATE TABLE "budget_import_logs" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploaderId" TEXT,
    "totalRows" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_master_parameterName_solId_periodKey_key" ON "budget_master"("parameterName", "solId", "periodKey");

-- AddForeignKey
ALTER TABLE "budget_master" ADD CONSTRAINT "budget_master_solId_fkey" FOREIGN KEY ("solId") REFERENCES "branches"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
