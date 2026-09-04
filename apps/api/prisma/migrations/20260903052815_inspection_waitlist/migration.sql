-- CreateEnum
CREATE TYPE "InspectionGate" AS ENUM ('ROUTE_ADVANCE', 'LOT_COMPLETE');

-- CreateEnum
CREATE TYPE "InspectionExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionVerdict" AS ENUM ('PASS', 'FAIL', 'HOLD');

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" VARCHAR(24) NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "productionLotNumber" VARCHAR(24) NOT NULL,
    "processStepName" VARCHAR(60) NOT NULL,
    "gate" "InspectionGate" NOT NULL,
    "specName" VARCHAR(100) NOT NULL,
    "executionStatus" "InspectionExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "verdict" "InspectionVerdict",
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_inspectionNumber_key" ON "Inspection"("inspectionNumber");

-- CreateIndex
CREATE INDEX "Inspection_executionStatus_verdict_idx" ON "Inspection"("executionStatus", "verdict");

-- CreateIndex
CREATE INDEX "Inspection_workOrderId_idx" ON "Inspection"("workOrderId");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
