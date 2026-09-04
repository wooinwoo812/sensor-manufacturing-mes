-- CreateEnum
CREATE TYPE "QualityIncidentStatus" AS ENUM ('OPEN', 'ASSESSED', 'CONTAINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QualityIncidentSourceType" AS ENUM ('MATERIAL_LOT', 'PRODUCTION_LOT', 'FINISHED_UNIT');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'QUALITY_INCIDENT_REGISTERED';

-- CreateTable
CREATE TABLE "QualityIncident" (
    "id" TEXT NOT NULL,
    "incidentNumber" VARCHAR(24) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "sourceType" "QualityIncidentSourceType" NOT NULL,
    "sourceLotNumber" VARCHAR(24) NOT NULL,
    "description" VARCHAR(500),
    "status" "QualityIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualityIncident_incidentNumber_key" ON "QualityIncident"("incidentNumber");

-- CreateIndex
CREATE INDEX "QualityIncident_status_detectedAt_idx" ON "QualityIncident"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "QualityIncident_sourceType_sourceLotNumber_idx" ON "QualityIncident"("sourceType", "sourceLotNumber");
