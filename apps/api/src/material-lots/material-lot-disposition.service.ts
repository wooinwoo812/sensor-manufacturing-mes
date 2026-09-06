import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { QualityDisposition } from "../generated/prisma/enums.js";
import { PrismaService } from "../database/prisma.service.js";
import { auditSummary } from "../audit-events/audit-summary.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";
import { computeAvailableQuantity } from "./material-lots.service.js";

const DISPOSITION_TARGETS: Record<
  QualityDisposition,
  readonly QualityDisposition[]
> = {
  PENDING: ["ACCEPTED", "HOLD", "REJECTED"],
  HOLD: ["ACCEPTED", "REJECTED"],
  QUARANTINED: ["ACCEPTED", "HOLD", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
};

const DISPOSITION_LABELS: Record<QualityDisposition, string> = {
  PENDING: "결정 대기",
  ACCEPTED: "합격",
  HOLD: "보류",
  QUARANTINED: "격리",
  REJECTED: "거부(폐기)",
};

function invalidInput(message: string) {
  return new BadRequestException({
    code: "INVALID_MATERIAL_LOT_DISPOSITION_INPUT",
    message,
  });
}

@Injectable()
export class MaterialLotDispositionService {
  constructor(private readonly prisma: PrismaService) {}

  async decide(
    lotId: string,
    input: { disposition?: unknown; memo?: unknown },
    actor: CommandActor,
  ) {
    const disposition = input.disposition;
    if (
      typeof disposition !== "string" ||
      !["ACCEPTED", "HOLD", "REJECTED"].includes(disposition)
    ) {
      throw invalidInput(
        "품질 처분은 ACCEPTED, HOLD, REJECTED 중 하나여야 합니다.",
      );
    }
    let memo: string | undefined;
    if (
      input.memo !== undefined &&
      input.memo !== null &&
      input.memo !== ""
    ) {
      if (typeof input.memo !== "string" || input.memo.length > 300) {
        throw invalidInput("처분 사유는 300자 이하여야 합니다.");
      }
      memo = input.memo;
    }
    const next = disposition as "ACCEPTED" | "HOLD" | "REJECTED";

    const result = await this.prisma.$transaction(async (transaction) => {
      const lot = await transaction.materialLot.findUnique({
        where: { id: lotId },
        include: { material: true },
      });
      if (lot === null) {
        throw new NotFoundException({
          code: "MATERIAL_LOT_NOT_FOUND",
          message: "자재 LOT을 찾을 수 없습니다.",
        });
      }

      const current = lot.qualityDisposition;
      const allowed = DISPOSITION_TARGETS[current];
      if (!allowed.includes(next)) {
        throw new ConflictException({
          code: "MATERIAL_LOT_DISPOSITION_FORBIDDEN",
          message:
            current === "ACCEPTED"
              ? "합격된 자재 LOT의 사후 품질 문제는 부적합 사건 등록으로 격리한 뒤 처분해야 합니다."
              : "이미 폐기 처분된 자재 LOT은 품질 처분을 변경할 수 없습니다.",
          currentDisposition: current,
          requestedDisposition: next,
        });
      }

      if (next === "REJECTED") {
        const activeAllocations = await transaction.materialAllocation.count({
          where: { materialLotId: lot.id, status: "ACTIVE" },
        });
        if (activeAllocations > 0) {
          throw new ConflictException({
            code: "MATERIAL_LOT_HAS_ACTIVE_RESERVATIONS",
            message: `활성 예약 ${activeAllocations}건이 남아 있습니다. 예약을 먼저 해제한 뒤 폐기 처분해야 합니다.`,
            activeAllocations,
          });
        }
      }

      const availableBefore = computeAvailableQuantity(lot);

      const updated = await transaction.materialLot.update({
        where: { id: lot.id },
        data:
          next === "REJECTED"
            ? {
                qualityDisposition: "REJECTED",
                scrappedQuantity: { increment: lot.onHand },
                onHand: 0,
              }
            : { qualityDisposition: next },
      });

      const availableAfter = computeAvailableQuantity(updated);

      await transaction.auditEvent.create({
        data: {
          occurredAt: new Date(),
          actorId: actor.userId,
          actorRole: actor.activeRole,
          actorName: actor.displayName,
          action: "MATERIAL_LOT_DISPOSITION_DECIDED",
          entityType: "MATERIAL_LOT",
          entityId: lot.lotNumber,
          summary: auditSummary(`${lot.material.name} ${lot.lotNumber} 품질 처분 ${DISPOSITION_LABELS[current]} → ${DISPOSITION_LABELS[next]}${next === "REJECTED" ? ` (잔여 ${lot.onHand}${lot.material.unit} 폐기 이관)` : ""}${memo === undefined ? "" : ` — ${memo}`}`),
          ...(memo === undefined ? {} : { details: { reason: memo } }),
          requestId: `req-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        },
      });

      return {
        lotId: updated.id,
        lotNumber: updated.lotNumber,
        previousDisposition: current,
        disposition: updated.qualityDisposition,
        onHand: updated.onHand,
        scrappedQuantity: updated.scrappedQuantity,
        availableQuantityBefore: availableBefore,
        availableQuantityAfter: availableAfter,
      };
    });

    return { ok: true as const, lot: result };
  }
}

export type MaterialLotDispositionResult =
  Awaited<ReturnType<MaterialLotDispositionService["decide"]>>;
