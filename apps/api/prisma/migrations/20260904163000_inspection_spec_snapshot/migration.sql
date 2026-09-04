-- CreateEnum
CREATE TYPE "InspectionSpecLifecycle" AS ENUM ('DRAFT', 'PUBLISHED', 'INACTIVE');

-- CreateTable
CREATE TABLE "InspectionSpecRevision" (
    "id" TEXT NOT NULL,
    "revisionNumber" VARCHAR(24) NOT NULL,
    "productCode" VARCHAR(30) NOT NULL,
    "specName" VARCHAR(100) NOT NULL,
    "gate" "InspectionGate" NOT NULL,
    "processStepName" VARCHAR(60),
    "description" VARCHAR(300),
    "lifecycle" "InspectionSpecLifecycle" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionSpecRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionRequirement" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "inspectionSpecRevisionId" TEXT NOT NULL,
    "specName" VARCHAR(100) NOT NULL,
    "gate" "InspectionGate" NOT NULL,
    "processStepName" VARCHAR(60),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectionSpecRevision_revisionNumber_key" ON "InspectionSpecRevision"("revisionNumber");

-- CreateIndex
CREATE INDEX "InspectionSpecRevision_productCode_lifecycle_idx" ON "InspectionSpecRevision"("productCode", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionRequirement_workOrderId_inspectionSpecRevisionId_key" ON "InspectionRequirement"("workOrderId", "inspectionSpecRevisionId");

-- CreateIndex
CREATE INDEX "InspectionRequirement_workOrderId_idx" ON "InspectionRequirement"("workOrderId");

-- AddForeignKey
ALTER TABLE "InspectionRequirement" ADD CONSTRAINT "InspectionRequirement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRequirement" ADD CONSTRAINT "InspectionRequirement_inspectionSpecRevisionId_fkey" FOREIGN KEY ("inspectionSpecRevisionId") REFERENCES "InspectionSpecRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
