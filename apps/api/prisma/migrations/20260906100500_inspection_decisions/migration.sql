CREATE TABLE "InspectionDecision" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "phase" VARCHAR(20) NOT NULL,
  "verdict" "InspectionVerdict" NOT NULL,
  "memo" VARCHAR(300),
  "actorId" VARCHAR(64),
  "actorName" VARCHAR(100),
  "actorRole" "RoleCode",
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InspectionDecision_phase_check" CHECK ("phase" IN ('INITIAL', 'HOLD_REVIEW', 'LEGACY')),
  CONSTRAINT "InspectionDecision_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "InspectionDecision_review_check" CHECK ("phase" <> 'HOLD_REVIEW' OR "verdict" IN ('PASS', 'FAIL'))
);
CREATE UNIQUE INDEX "InspectionDecision_inspectionId_sequence_key" ON "InspectionDecision"("inspectionId", "sequence");
ALTER TABLE "InspectionDecision" ADD CONSTRAINT "InspectionDecision_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
