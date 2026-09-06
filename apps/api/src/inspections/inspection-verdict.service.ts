import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { auditSummary } from "../audit-events/audit-summary.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";
import { productionTransaction, refreshMaterialReadiness, refreshProductionFlow } from "../process-executions/production-flow.js";
import { inspectionEligibility } from "./inspection-eligibility.js";

type Verdict = "PASS" | "FAIL" | "HOLD";
function parseInput(input: { verdict?: unknown; memo?: unknown }, review: boolean) {
  const invalid = (message: string) => new BadRequestException({ code: "INVALID_INSPECTION_VERDICT_INPUT", message });
  if (typeof input.verdict !== "string" || !(review ? ["PASS", "FAIL"] : ["PASS", "FAIL", "HOLD"]).includes(input.verdict)) {
    throw invalid(review ? "보류 검토 결과는 합격 또는 불합격이어야 합니다." : "판정은 PASS, FAIL, HOLD 중 하나여야 합니다.");
  }
  if (input.memo != null && typeof input.memo !== "string") throw invalid("판정 사유는 문자열이어야 합니다.");
  const memo = typeof input.memo === "string" ? input.memo.trim() : "";
  if (memo.length > 300) throw invalid("판정 사유는 300자 이하여야 합니다.");
  if ((review || input.verdict !== "PASS") && memo.length < 2) throw invalid("불합격·보류 및 보류 검토 사유를 2자 이상 입력해 주세요.");
  return { verdict: input.verdict as Verdict, memo: memo || null };
}

@Injectable()
export class InspectionVerdictService {
  constructor(private readonly prisma: PrismaService) {}

  verdict(id: string, input: { verdict?: unknown; memo?: unknown }, actor: CommandActor) {
    return this.record(id, input, actor, false);
  }

  review(id: string, input: { verdict?: unknown; memo?: unknown }, actor: CommandActor) {
    return this.record(id, input, actor, true);
  }

  private async record(id: string, input: { verdict?: unknown; memo?: unknown }, actor: CommandActor, review: boolean) {
    const { verdict, memo } = parseInput(input, review);
    return productionTransaction(this.prisma, async (tx) => {
      const inspection = await tx.inspection.findUnique({ where: { id } });
      if (!inspection) throw new NotFoundException({ code: "INSPECTION_NOT_FOUND", message: "검사를 찾을 수 없습니다." });
      if (review && !(inspection.executionStatus === "COMPLETED" && inspection.verdict === "HOLD")) {
        throw new ConflictException({ code: "INSPECTION_NOT_HELD", message: "현재 보류 상태인 검사만 검토할 수 있습니다." });
      }
      if (!review && inspection.executionStatus === "COMPLETED") {
        throw new ConflictException({ code: "INSPECTION_ALREADY_VERDICTED", message: "이미 판정된 검사입니다. 보류 상태는 보류 검토에서 처리해 주세요.", currentVerdict: inspection.verdict });
      }
      if (inspection.executionStatus === "CANCELLED") throw new ConflictException({ code: "INSPECTION_CANCELLED", message: "취소된 검사는 판정할 수 없습니다." });
      const order = await tx.workOrder.findUnique({ where: { id: inspection.workOrderId } });
      const steps = await tx.processStepExecution.findMany({ where: { workOrderId: inspection.workOrderId } });
      const eligibility = inspectionEligibility(inspection, order?.status ?? "", steps);
      if (!(review ? eligibility.canReview : eligibility.canVerdict)) {
        throw new ConflictException({ code: "INSPECTION_NOT_READY", message: eligibility.blockedReason ?? "현재 검사 상태에서는 처리할 수 없습니다." });
      }
      const now = new Date();
      let sequence = 1;
      if (review) {
        const latest = await tx.inspectionDecision.findFirst({ where: { inspectionId: id }, orderBy: { sequence: "desc" } });
        if (!latest) {
          // Preserve imported history without attributing the original decision to the reviewer.
          await tx.inspectionDecision.create({ data: {
            inspectionId: id, sequence: 1, phase: "LEGACY", verdict: "HOLD",
            memo: inspection.verdictMemo, occurredAt: inspection.completedAt ?? inspection.createdAt,
          } });
        }
        sequence = (latest?.sequence ?? 1) + 1;
      }
      await tx.inspectionDecision.create({ data: {
        inspectionId: id, sequence, phase: review ? "HOLD_REVIEW" : "INITIAL", verdict, memo,
        actorId: actor.userId, actorName: actor.displayName, actorRole: actor.activeRole, occurredAt: now,
      } });
      // Current projection and append-only decisions commit with downstream state and audit.
      await tx.inspection.update({ where: { id }, data: { executionStatus: "COMPLETED", verdict, verdictMemo: memo, completedAt: now } });
      await refreshMaterialReadiness(tx, inspection.workOrderId);
      await refreshProductionFlow(tx, inspection.workOrderId);
      const label = { PASS: "합격", FAIL: "불합격", HOLD: "보류" }[verdict];
      await tx.auditEvent.create({ data: {
        occurredAt: now, actorId: actor.userId, actorRole: actor.activeRole, actorName: actor.displayName,
        action: "INSPECTION_VERDICTED", entityType: "INSPECTION", entityId: inspection.inspectionNumber,
        summary: auditSummary(`${inspection.specName} ${review ? "보류 검토 → " : ""}${label} (${inspection.productionLotNumber})${memo ? ` · ${memo}` : ""}`),
        details: { phase: review ? "HOLD_REVIEW" : "INITIAL", previousVerdict: inspection.verdict, verdict, memo, sequence },
        requestId: `req-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      } });
      return { ok: true as const };
    });
  }
}
