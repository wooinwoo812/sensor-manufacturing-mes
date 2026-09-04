-- CreateEnum
CREATE TYPE "TraceNodeType" AS ENUM ('MATERIAL_LOT', 'PRODUCTION_LOT');

-- CreateEnum
CREATE TYPE "LotRelationType" AS ENUM ('CONSUME');

-- CreateTable
CREATE TABLE "TraceNode" (
    "id" TEXT NOT NULL,
    "nodeType" "TraceNodeType" NOT NULL,
    "label" VARCHAR(24) NOT NULL,
    "materialLotId" TEXT,
    "productionLotNumber" VARCHAR(24),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraceNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotRelation" (
    "id" TEXT NOT NULL,
    "relationType" "LotRelationType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "parentNodeId" TEXT NOT NULL,
    "childNodeId" TEXT NOT NULL,
    "processStepExecutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TraceNode_materialLotId_key" ON "TraceNode"("materialLotId");

-- CreateIndex
CREATE UNIQUE INDEX "TraceNode_productionLotNumber_key" ON "TraceNode"("productionLotNumber");

-- CreateIndex
CREATE INDEX "TraceNode_nodeType_label_idx" ON "TraceNode"("nodeType", "label");

-- CreateIndex
CREATE UNIQUE INDEX "LotRelation_relationType_parentNodeId_childNodeId_key" ON "LotRelation"("relationType", "parentNodeId", "childNodeId");

-- CreateIndex
CREATE INDEX "LotRelation_childNodeId_idx" ON "LotRelation"("childNodeId");

-- CreateIndex
CREATE INDEX "LotRelation_parentNodeId_idx" ON "LotRelation"("parentNodeId");

-- AddForeignKey
ALTER TABLE "TraceNode" ADD CONSTRAINT "TraceNode_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotRelation" ADD CONSTRAINT "LotRelation_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "TraceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotRelation" ADD CONSTRAINT "LotRelation_childNodeId_fkey" FOREIGN KEY ("childNodeId") REFERENCES "TraceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
