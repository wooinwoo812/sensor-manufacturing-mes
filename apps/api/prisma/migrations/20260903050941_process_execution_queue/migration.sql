-- CreateEnum
CREATE TYPE "ProcessReadiness" AS ENUM ('WAITING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateTable
CREATE TABLE "ProcessStepExecution" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "processStepName" VARCHAR(60) NOT NULL,
    "productionLotNumber" VARCHAR(24) NOT NULL,
    "readiness" "ProcessReadiness" NOT NULL DEFAULT 'WAITING',
    "blockedReasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessStepExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessStepExecution_readiness_idx" ON "ProcessStepExecution"("readiness");

-- CreateIndex
CREATE INDEX "ProcessStepExecution_workOrderId_sequence_idx" ON "ProcessStepExecution"("workOrderId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStepExecution_workOrderId_sequence_productionLotNumb_key" ON "ProcessStepExecution"("workOrderId", "sequence", "productionLotNumber");

-- AddForeignKey
ALTER TABLE "ProcessStepExecution" ADD CONSTRAINT "ProcessStepExecution_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
