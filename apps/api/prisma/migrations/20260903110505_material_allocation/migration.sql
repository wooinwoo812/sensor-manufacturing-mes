-- CreateEnum
CREATE TYPE "MaterialAllocationStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'MATERIAL_RESERVATION_RELEASED';

-- CreateTable
CREATE TABLE "MaterialAllocation" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "materialLotId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "MaterialAllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "closedAt" TIMESTAMP(3),
    "closedReason" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialAllocation_workOrderId_status_idx" ON "MaterialAllocation"("workOrderId", "status");

-- CreateIndex
CREATE INDEX "MaterialAllocation_materialLotId_status_idx" ON "MaterialAllocation"("materialLotId", "status");

-- AddForeignKey
ALTER TABLE "MaterialAllocation" ADD CONSTRAINT "MaterialAllocation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAllocation" ADD CONSTRAINT "MaterialAllocation_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
