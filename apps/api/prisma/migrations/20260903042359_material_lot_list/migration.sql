-- CreateEnum
CREATE TYPE "QualityDisposition" AS ENUM ('PENDING', 'ACCEPTED', 'HOLD', 'QUARANTINED', 'REJECTED');

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(10) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialLot" (
    "id" TEXT NOT NULL,
    "lotNumber" VARCHAR(24) NOT NULL,
    "materialId" TEXT NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "onHand" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL,
    "consumedQuantity" INTEGER NOT NULL DEFAULT 0,
    "scrappedQuantity" INTEGER NOT NULL DEFAULT 0,
    "qualityDisposition" "QualityDisposition" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialLot_lotNumber_key" ON "MaterialLot"("lotNumber");

-- CreateIndex
CREATE INDEX "MaterialLot_qualityDisposition_expiresAt_idx" ON "MaterialLot"("qualityDisposition", "expiresAt");

-- CreateIndex
CREATE INDEX "MaterialLot_materialId_idx" ON "MaterialLot"("materialId");

-- AddForeignKey
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
