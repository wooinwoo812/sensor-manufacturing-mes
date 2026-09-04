-- CreateTable
CREATE TABLE "WorkOrderMaterialRequirement" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "bomRevisionId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityPerProductBaseUom" DECIMAL(18,6) NOT NULL,
    "requiredQuantity" DECIMAL(18,6) NOT NULL,
    "unit" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderMaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "bomRevisionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderMaterialRequirement_workOrderId_materialId_key" ON "WorkOrderMaterialRequirement"("workOrderId", "materialId");

-- CreateIndex
CREATE INDEX "WorkOrderMaterialRequirement_workOrderId_idx" ON "WorkOrderMaterialRequirement"("workOrderId");

-- AddForeignKey
ALTER TABLE "WorkOrderMaterialRequirement" ADD CONSTRAINT "WorkOrderMaterialRequirement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMaterialRequirement" ADD CONSTRAINT "WorkOrderMaterialRequirement_bomRevisionId_fkey" FOREIGN KEY ("bomRevisionId") REFERENCES "BomRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMaterialRequirement" ADD CONSTRAINT "WorkOrderMaterialRequirement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_bomRevisionId_fkey" FOREIGN KEY ("bomRevisionId") REFERENCES "BomRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
