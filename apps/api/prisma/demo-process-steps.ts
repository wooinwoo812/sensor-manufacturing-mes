export interface DemoProcessStep {
  workOrderNumber: string;
  sequence: number;
  processStepName: string;
  productionLotNumber: string;
  readiness: "WAITING" | "READY" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  blockedReasonCodes: string[];
}

export const DEMO_PROCESS_STEPS: DemoProcessStep[] = [
  {
    workOrderNumber: "WO-2026-091",
    sequence: 30,
    processStepName: "조립 2공정",
    productionLotNumber: "PL-2026-091A",
    readiness: "IN_PROGRESS",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-091",
    sequence: 40,
    processStepName: "최종 검사",
    productionLotNumber: "PL-2026-091A",
    readiness: "WAITING",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-091",
    sequence: 50,
    processStepName: "포장",
    productionLotNumber: "PL-2026-091A",
    readiness: "WAITING",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-092",
    sequence: 10,
    processStepName: "절단 1공정",
    productionLotNumber: "PL-2026-092A",
    readiness: "BLOCKED",
    blockedReasonCodes: ["MATERIAL_SHORTAGE"],
  },
  {
    workOrderNumber: "WO-2026-094",
    sequence: 30,
    processStepName: "조립 2공정",
    productionLotNumber: "PL-2026-094A",
    readiness: "COMPLETED",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-094",
    sequence: 40,
    processStepName: "최종 검사",
    productionLotNumber: "PL-2026-094A",
    readiness: "READY",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-097",
    sequence: 10,
    processStepName: "절단 1공정",
    productionLotNumber: "PL-2026-097A",
    readiness: "READY",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-097",
    sequence: 20,
    processStepName: "조립 1공정",
    productionLotNumber: "PL-2026-097A",
    readiness: "WAITING",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-098",
    sequence: 20,
    processStepName: "침담 공정",
    productionLotNumber: "PL-2026-098A",
    readiness: "IN_PROGRESS",
    blockedReasonCodes: [],
  },
  {
    workOrderNumber: "WO-2026-098",
    sequence: 30,
    processStepName: "조립 2공정",
    productionLotNumber: "PL-2026-098A",
    readiness: "BLOCKED",
    blockedReasonCodes: ["INSPECTION_HELD"],
  },
  {
    workOrderNumber: "WO-2026-095",
    sequence: 50,
    processStepName: "포장",
    productionLotNumber: "PL-2026-095A",
    readiness: "COMPLETED",
    blockedReasonCodes: [],
  },
];
