interface InspectionState {
  executionStatus: string;
  verdict: string | null;
  gate: string;
  productionLotNumber: string;
  processStepName: string;
}
interface StepState {
  productionLotNumber: string;
  processStepName: string;
  sequence: number;
  readiness: string;
}

export function inspectionEligibility(
  inspection: InspectionState,
  orderStatus: string,
  steps: readonly StepState[],
) {
  const lotSteps = steps.filter(step => step.productionLotNumber === inspection.productionLotNumber);
  const step = lotSteps.find(row => row.processStepName === inspection.processStepName);
  let blockedReason: string | null = null;
  if (!["RELEASED", "IN_PROGRESS"].includes(orderStatus)) {
    blockedReason = "진행 가능한 작업지시에서만 검사할 수 있습니다.";
  } else if (lotSteps.length === 0) {
    blockedReason = "생산 LOT의 공정 이력을 먼저 확인해 주세요.";
  } else if (inspection.gate === "LOT_COMPLETE") {
    if (!lotSteps.every(row => row.readiness === "COMPLETED")) {
      blockedReason = "이 LOT의 모든 공정이 완료된 뒤 최종 판정을 기록할 수 있습니다.";
    }
  } else if (!step || !["IN_PROGRESS", "COMPLETED"].includes(step.readiness)) {
    blockedReason = "해당 공정을 시작한 뒤 검사 판정을 기록할 수 있습니다.";
  }
  const isHeld = inspection.executionStatus === "COMPLETED" && inspection.verdict === "HOLD";
  if (isHeld && inspection.gate === "ROUTE_ADVANCE" && step && lotSteps.some(row => row.sequence > step.sequence && ["IN_PROGRESS", "COMPLETED"].includes(row.readiness))) {
    blockedReason = "후속 공정이 이미 시작되어 보류를 검토할 수 없습니다. 관련 이력을 확인해 주세요.";
  }
  return {
    canVerdict: blockedReason === null && ["PENDING", "IN_PROGRESS"].includes(inspection.executionStatus),
    canReview: blockedReason === null && isHeld,
    blockedReason,
  };
}
