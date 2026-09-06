export interface DemoInspection {
  inspectionNumber: string;
  workOrderNumber: string;
  productionLotNumber: string;
  processStepName: string;
  gate: "ROUTE_ADVANCE" | "LOT_COMPLETE";
  specName: string;
  executionStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  verdict: "PASS" | "FAIL" | "HOLD" | null;
  completedAt: Date | null;
}

const dayOffset = (days: number) => new Date(Date.now() + days * 86_400_000);

export const DEMO_INSPECTIONS: DemoInspection[] = [
  {
    inspectionNumber: "INSP-2026-0101",
    workOrderNumber: "WO-2026-091",
    productionLotNumber: "PL-2026-091A",
    processStepName: "최종 검사",
    gate: "LOT_COMPLETE",
    specName: "적외선 모듈 최종검사 규격 v3",
    executionStatus: "PENDING",
    verdict: null,
    completedAt: null,
  },
  {
    inspectionNumber: "INSP-2026-0102",
    workOrderNumber: "WO-2026-094",
    productionLotNumber: "PL-2026-094A",
    processStepName: "최종 검사",
    gate: "LOT_COMPLETE",
    specName: "적외선 모듈 최종검사 규격 v3",
    executionStatus: "PENDING",
    verdict: null,
    completedAt: null,
  },
  {
    inspectionNumber: "INSP-2026-0103",
    workOrderNumber: "WO-2026-091",
    productionLotNumber: "PL-2026-091A",
    processStepName: "조립 2공정",
    gate: "ROUTE_ADVANCE",
    specName: "조립 정밀도 검사 규격 v2",
    executionStatus: "COMPLETED",
    verdict: "PASS",
    completedAt: dayOffset(-4),
  },
  {
    inspectionNumber: "INSP-2026-0104",
    workOrderNumber: "WO-2026-098",
    productionLotNumber: "PL-2026-098A",
    processStepName: "침담 공정",
    gate: "ROUTE_ADVANCE",
    specName: "침담 품질 검사 규격 v1",
    executionStatus: "COMPLETED",
    verdict: "HOLD",
    completedAt: dayOffset(-2),
  },
  {
    inspectionNumber: "INSP-2026-0105",
    workOrderNumber: "WO-2026-095",
    productionLotNumber: "PL-2026-095A",
    processStepName: "최종 검사",
    gate: "LOT_COMPLETE",
    specName: "X선 패널 최종검사 규격 v4",
    executionStatus: "COMPLETED",
    verdict: "PASS",
    completedAt: dayOffset(-3),
  },
  {
    inspectionNumber: "INSP-2026-0106",
    workOrderNumber: "WO-2026-092",
    productionLotNumber: "PL-2026-092A",
    processStepName: "절단 1공정",
    gate: "ROUTE_ADVANCE",
    specName: "절단 치수 검사 규격 v2",
    executionStatus: "PENDING",
    verdict: null,
    completedAt: null,
  },
  {
    inspectionNumber: "INSP-2026-0107",
    workOrderNumber: "WO-2026-094",
    productionLotNumber: "PL-2026-094A",
    processStepName: "조립 2공정",
    gate: "ROUTE_ADVANCE",
    specName: "조립 정밀도 검사 규격 v2",
    executionStatus: "COMPLETED",
    verdict: "FAIL",
    completedAt: dayOffset(-1),
  },
  {
    inspectionNumber: "INSP-2026-0108",
    workOrderNumber: "WO-2026-095",
    productionLotNumber: "PL-2026-095A",
    processStepName: "포장",
    gate: "ROUTE_ADVANCE",
    specName: "포장 상태 검사 규격 v1",
    executionStatus: "COMPLETED",
    verdict: "PASS",
    completedAt: dayOffset(-1),
  },
  {
    inspectionNumber: "INSP-2026-0109",
    workOrderNumber: "WO-2026-097",
    productionLotNumber: "PL-2026-097A",
    processStepName: "절단 1공정",
    gate: "ROUTE_ADVANCE",
    specName: "절단 치수 검사 규격 v2",
    executionStatus: "CANCELLED",
    verdict: null,
    completedAt: null,
  },
  {
    inspectionNumber: "INSP-2026-0110",
    workOrderNumber: "WO-2026-098",
    productionLotNumber: "PL-2026-098A",
    processStepName: "조립 2공정",
    gate: "ROUTE_ADVANCE",
    specName: "조립 정밀도 검사 규격 v2",
    executionStatus: "PENDING",
    verdict: null,
    completedAt: null,
  },
];
