-- CreateEnum
CREATE TYPE "BomRevisionLifecycle" AS ENUM ('DRAFT', 'PUBLISHED', 'INACTIVE');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "baseUom" VARCHAR(10) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomRevision" (
    "id" TEXT NOT NULL,
    "revisionNumber" VARCHAR(24) NOT NULL,
    "productId" TEXT NOT NULL,
    "description" VARCHAR(300),
    "lifecycle" "BomRevisionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BomRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL,
    "bomRevisionId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityPerProductBaseUom" DECIMAL(18,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BomRevision_revisionNumber_key" ON "BomRevision"("revisionNumber");

-- CreateIndex
CREATE INDEX "BomRevision_productId_lifecycle_idx" ON "BomRevision"("productId", "lifecycle");

-- CreateIndex
CREATE UNIQUE INDEX "BomItem_bomRevisionId_materialId_key" ON "BomItem"("bomRevisionId", "materialId");

-- CreateIndex
CREATE INDEX "BomItem_materialId_idx" ON "BomItem"("materialId");

-- AddForeignKey
ALTER TABLE "BomRevision" ADD CONSTRAINT "BomRevision_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_bomRevisionId_fkey" FOREIGN KEY ("bomRevisionId") REFERENCES "BomRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
