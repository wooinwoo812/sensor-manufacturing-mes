import { ConflictException } from "@nestjs/common";
import type { Prisma, ProcessStepExecution, Inspection } from "../generated/prisma/client.js";
import type { PrismaService } from "../database/prisma.service.js";

type Step = Pick<ProcessStepExecution, "id" | "sequence" | "productionLotNumber" | "processStepName" | "readiness" | "goodQuantity" | "blockedReasonCodes">;
type Check = Pick<Inspection, "productionLotNumber" | "processStepName" | "gate" | "executionStatus" | "verdict">;

/** The demo supports one unsplit LOT per newly released work order. */
export const PRODUCT_ROUTES: Readonly<Record<string, readonly string[]>> = {
  "SEN-IR-640": ["절단 1공정", "조립 1공정", "조립 2공정", "최종 검사", "포장"],
  "SEN-XR-1280": ["절단 1공정", "침담 공정", "조립 2공정", "최종 검사", "포장"],
  "SEN-IR-320-QC": ["코어 조립", "최종 검사", "포장"],
};

export function outputQuantityLimit(step: Step, steps: readonly Step[], planned: number): number | null {
  const previous = steps.filter((row) => row.productionLotNumber === step.productionLotNumber && row.sequence < step.sequence)
    .sort((a, b) => b.sequence - a.sequence)[0];
  if (!previous) return planned;
  if (previous.readiness !== "COMPLETED" || previous.goodQuantity === null) return null;
  return Math.min(planned, previous.goodQuantity);
}

export function inspectionReasons(inspections: readonly Check[]): string[] {
  return [...new Set(inspections.filter((row) => row.executionStatus !== "CANCELLED").flatMap((row) => {
    if (row.executionStatus !== "COMPLETED" || row.verdict === null) return ["INSPECTION_PENDING"];
    if (row.verdict === "FAIL") return ["INSPECTION_FAILED"];
    if (row.verdict === "HOLD") return ["INSPECTION_HELD"];
    return [];
  }))];
}

export async function refreshMaterialReadiness(tx: Prisma.TransactionClient, workOrderId: string) {
  const requirements = await tx.workOrderMaterialRequirement.findMany({ where: { workOrderId } });
  // Existing demo records without a released BOM keep their explicit material blocks.
  if (requirements.length === 0) return;
  const allocations = await tx.materialAllocation.findMany({ where: { workOrderId, status: "ACTIVE" }, include: { materialLot: true } });
  const steps = await tx.processStepExecution.findMany({ where: { workOrderId }, orderBy: { sequence: "asc" } });
  const first = steps[0];
  if (!first || first.readiness === "IN_PROGRESS" || first.readiness === "COMPLETED") return;
  const enough = requirements.every((requirement) => {
    const reserved = allocations.filter((allocation) => allocation.materialLot.materialId === requirement.materialId && allocation.materialLot.qualityDisposition === "ACCEPTED" && (allocation.materialLot.expiresAt === null || allocation.materialLot.expiresAt.getTime() > Date.now()))
      .reduce((sum, allocation) => sum + allocation.quantity, 0);
    // Demo inventory is indivisible EA. Fractional BOM demand is rounded up once per order.
    return reserved >= Math.ceil(Number(requirement.requiredQuantity));
  });
  const reasons = first.blockedReasonCodes.filter((code) => !["MATERIAL_SHORTAGE", "MATERIAL_EXPIRED", "MATERIAL_QUARANTINED"].includes(code));
  if (!enough) reasons.push("MATERIAL_SHORTAGE");
  await tx.processStepExecution.update({ where: { id: first.id }, data: { blockedReasonCodes: reasons, readiness: reasons.length > 0 ? "BLOCKED" : "READY" } });
}

const reasonLabels: Record<string, string> = {
  INSPECTION_PENDING: "검사 대기", INSPECTION_FAILED: "검사 불합격", INSPECTION_HELD: "검사 보류",
  NO_GOOD_OUTPUT: "선행 공정 양품 없음", PREDECESSOR_QUANTITY_MISSING: "선행 공정 실적 확인 필요",
  MATERIAL_SHORTAGE: "자재 부족", MATERIAL_EXPIRED: "자재 만료", MATERIAL_QUARANTINED: "자재 격리",
};
const flowReasons = new Set(["INSPECTION_PENDING", "INSPECTION_FAILED", "INSPECTION_HELD", "NO_GOOD_OUTPUT", "PREDECESSOR_QUANTITY_MISSING", "PREREQUISITE_INCOMPLETE"]);

/** Refresh only derived flow conditions; material/incident/manual blocks survive. */
export async function refreshProductionFlow(tx: Prisma.TransactionClient, workOrderId: string) {
  const order = await tx.workOrder.findUnique({ where: { id: workOrderId } });
  if (!order || order.status === "CANCELLED" || order.status === "DRAFT") return;
  const steps = await tx.processStepExecution.findMany({ where: { workOrderId }, orderBy: { sequence: "asc" } });
  const inspections = await tx.inspection.findMany({ where: { workOrderId } });
  for (const step of steps) {
    if (step.readiness === "COMPLETED" || step.readiness === "IN_PROGRESS") continue;
    const prior = steps.filter((row) => row.productionLotNumber === step.productionLotNumber && row.sequence < step.sequence);
    const priorComplete = prior.every((row) => row.readiness === "COMPLETED");
    const reasons = step.blockedReasonCodes.filter((code) => !flowReasons.has(code));
    reasons.push(...inspectionReasons(inspections.filter((row) => row.productionLotNumber === step.productionLotNumber && row.gate === "ROUTE_ADVANCE" && prior.some((p) => p.processStepName === row.processStepName))));
    const quantity = outputQuantityLimit(step, steps, order.plannedQuantity);
    if (priorComplete && quantity === 0) reasons.push("NO_GOOD_OUTPUT");
    if (priorComplete && quantity === null) reasons.push("PREDECESSOR_QUANTITY_MISSING");
    const readiness = reasons.length > 0 ? "BLOCKED" : priorComplete ? "READY" : "WAITING";
    await tx.processStepExecution.update({ where: { id: step.id }, data: { readiness, blockedReasonCodes: [...new Set(reasons)] } });
    step.readiness = readiness;
    step.blockedReasonCodes = [...new Set(reasons)];
  }
  if (steps.length === 0) return;
  const completed = steps.filter((row) => row.readiness === "COMPLETED").length;
  const allCompleted = completed === steps.length;
  const pendingChecks = inspectionReasons(inspections);
  const started = steps.some((row) => row.readiness === "IN_PROGRESS" || row.readiness === "COMPLETED");
  const blocked = steps.find((row) => row.readiness === "BLOCKED");
  await tx.workOrder.update({ where: { id: workOrderId }, data: {
    progressPercent: Math.round(completed / steps.length * 100),
    currentStepName: steps.find((row) => row.readiness !== "COMPLETED")?.processStepName ?? null,
    status: allCompleted && pendingChecks.length === 0 ? "COMPLETED" : started ? "IN_PROGRESS" : "RELEASED",
    blockedReason: blocked ? `${blocked.processStepName}: ${blocked.blockedReasonCodes.map((code) => reasonLabels[code] ?? "준비 조건 확인 필요").join(", ")}` : allCompleted && pendingChecks.length > 0 ? "필수 검사 판정 확인 필요" : null,
  } });
}

/** Serialize competing changes and return a retryable domain conflict. */
export async function productionTransaction<T>(prisma: PrismaService, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(action, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      throw new ConflictException({ code: "PRODUCTION_STATE_CHANGED", message: "다른 요청이 업무 상태를 변경했습니다. 새로 조회한 뒤 다시 시도해 주세요." });
    }
    throw error;
  }
}
