-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SESSION_LOGIN', 'SESSION_LOGOUT', 'WORK_ORDER_CREATED', 'WORK_ORDER_RELEASED', 'WORK_ORDER_CANCELLED', 'MATERIAL_RESERVED', 'MATERIAL_LOT_DISPOSITION_DECIDED', 'INSPECTION_VERDICTED');

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "actorId" VARCHAR(64) NOT NULL,
    "actorRole" "RoleCode" NOT NULL,
    "actorName" VARCHAR(100) NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "summary" VARCHAR(200) NOT NULL,
    "requestId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorRole_action_idx" ON "AuditEvent"("actorRole", "action");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
