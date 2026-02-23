-- CreateTable
CREATE TABLE "ingestion_logs" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_vertical_status" (
    "id" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "vertical" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isFreezeBlocker" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_vertical_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stg_unit_financials_daily" (
    "id" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "sbBalance" DECIMAL(18,2),
    "cdBalance" DECIMAL(18,2),
    "tdBalance" DECIMAL(18,2),
    "advBalance" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stg_unit_financials_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stg_account_daily" (
    "id" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "balance" DECIMAL(18,2),
    "sbBalance" DECIMAL(18,2),
    "cdBalance" DECIMAL(18,2),
    "tdBalance" DECIMAL(18,2),
    "advBalance" DECIMAL(18,2),
    "busBalance" DECIMAL(18,2),
    "casaBalance" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stg_account_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stg_user_vertical_daily" (
    "id" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "outstanding" DECIMAL(18,2),
    "smaType" TEXT,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stg_user_vertical_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mis_facts" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "ingestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mis_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mis_snapshots" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "frozenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mis_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mis_information_panels" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "val_fy_start" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "val_fy_end" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "val_prev_m_end" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "val_dby" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "val_y_eod" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "val_current" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "growth_day" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "growth_month" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "growth_fy" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "budget_month" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gap_month" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "mis_information_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mis_exceptions" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggerValue" TEXT,
    "ruleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mis_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_vertical_status_businessDate_vertical_key" ON "ingestion_vertical_status"("businessDate", "vertical");

-- CreateIndex
CREATE INDEX "mis_facts_date_unitId_metric_idx" ON "mis_facts"("date", "unitId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "mis_snapshots_unitId_businessDate_version_key" ON "mis_snapshots"("unitId", "businessDate", "version");

-- AddForeignKey
ALTER TABLE "ingestion_logs" ADD CONSTRAINT "ingestion_logs_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_facts" ADD CONSTRAINT "mis_facts_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_facts" ADD CONSTRAINT "mis_facts_ingestionId_fkey" FOREIGN KEY ("ingestionId") REFERENCES "ingestion_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_snapshots" ADD CONSTRAINT "mis_snapshots_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_information_panels" ADD CONSTRAINT "mis_information_panels_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "mis_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_exceptions" ADD CONSTRAINT "mis_exceptions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "mis_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mis_exceptions" ADD CONSTRAINT "mis_exceptions_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
