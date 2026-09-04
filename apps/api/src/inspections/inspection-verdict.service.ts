import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";

function invalidInput(message: string) {
  return new BadRequestException({
    code: "INVALID_INSPECTION_VERDICT_INPUT",
    message,
  });
}

@Injectable()
export class InspectionVerdictService {
  constructor(private readonly prisma: PrismaService) {}

  async verdict(
    inspectionId: string,
    input: { verdict?: unknown; memo?: unknown },
    actor: CommandActor,
  ) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
    });
    if (inspection === null) {
      throw new NotFoundException({
        code: "INSPECTION_NOT_FOUND",
        message: "검사를 찾을 수 없습니다.",
      });
    }
    if (inspection.executionStatus === "COMPLETED") {
      throw new ConflictException({
        code: "INSPECTION_ALREADY_VERDICTED",
        message: "이미 판정이 완료된 검사입니다. 정정 흐름을 사용해 주세요.",
        currentVerdict: inspection.verdict,
      });
    }
    if (inspection.executionStatus === "CANCELLED") {
      throw new ConflictException({
        code: "INSPECTION_CANCELLED",
        message: "취소된 검사는 판정할 수 없습니다.",
      });
    }

    const verdict = input.verdict;
    if (
      typeof verdict !== "string" ||
      !["PASS", "FAIL", "HOLD"].includes(verdict)
    ) {
      throw invalidInput("판정은 PASS, FAIL, HOLD 중 하나여야 합니다.");
    }
    let memo: string | undefined;
    if (
      input.memo !== undefined &&
      input.memo !== null &&
      input.memo !== ""
    ) {
      if (typeof input.memo !== "string" || input.memo.length > 300) {
        throw invalidInput("판정 메모는 300자 이하여야 합니다.");
      }
      memo = input.memo;
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.inspection.update({
        where: { id: inspectionId },
        data: {
          executionStatus: "COMPLETED",
          verdict: verdict as "PASS" | "FAIL" | "HOLD",
          ...(memo !== undefined ? { verdictMemo: memo } : {}),
          completedAt: new Date(),
        },
      });

      const verdictLabel =
        verdict === "PASS" ? "합격" : verdict === "FAIL" ? "불합격" : "보류";
      await transaction.auditEvent.create({
        data: {
          occurredAt: new Date(),
          actorId: actor.userId,
          actorRole: actor.activeRole,
          actorName: actor.displayName,
          action: "INSPECTION_VERDICTED",
          entityType: "INSPECTION",
          entityId: inspection.inspectionNumber,
          summary: `${inspection.specName} ${verdictLabel} 판정 (${inspection.productionLotNumber})${memo === undefined ? "" : ` — ${memo}`}`,
          requestId: `req-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        },
      });
    });

    return { ok: true as const };
  }
}
