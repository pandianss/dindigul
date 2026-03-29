-- CreateTable
CREATE TABLE "committees" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "committees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "minutesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_action_points" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_action_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_records" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INWARD',
    "subject" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "referenceNo" TEXT,
    "consignmentNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_cases" (
    "id" TEXT NOT NULL,
    "caseNo" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "parties" TEXT NOT NULL,
    "nextHearingDate" TIMESTAMP(3),
    "advocateName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "category" TEXT NOT NULL DEFAULT 'CIVIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_actions" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "amountInvolved" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "branchId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_observations" (
    "id" TEXT NOT NULL,
    "auditType" TEXT,
    "observation" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "branchId" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "auditDate" TIMESTAMP(3),
    "rectificationDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_assets" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "purchaseValue" DOUBLE PRECISION,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "amcExpiry" TIMESTAMP(3),
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regional_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "serviceProvider" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "nextServiceDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "committees_code_key" ON "committees"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_records_referenceNo_key" ON "dispatch_records"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "legal_cases_caseNo_key" ON "legal_cases"("caseNo");

-- CreateIndex
CREATE UNIQUE INDEX "regional_assets_assetCode_key" ON "regional_assets"("assetCode");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "committees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_action_points" ADD CONSTRAINT "meeting_action_points_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_action_points" ADD CONSTRAINT "meeting_action_points_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_actions" ADD CONSTRAINT "recovery_actions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_observations" ADD CONSTRAINT "audit_observations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_assets" ADD CONSTRAINT "regional_assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "regional_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
