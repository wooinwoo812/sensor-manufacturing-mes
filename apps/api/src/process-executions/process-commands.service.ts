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
    code: "INVALID_PROCESS_EXECUTION_INPUT",
    message,
  });
}

@Injectable()
export class ProcessCommandsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(stepId: string, actor: CommandActor) {
    const step = await this.prisma.processStepExecution.findUnique({
      where: { id: stepId },
    });
    if (step === null) {
      throw new NotFoundException({
        code: "PROCESS_STEP_NOT_FOUND",
        message: "공정을 찾을 수 없습니다.",
      });
    }
    if (step.readiness !== "READY") {
      throw new ConflictException({
        code: "PROCESS_NOT_READY",
        message: "실행 가능 상태의 공정만 시작할 수 있습니다.",
        currentReadiness: step.readiness,
        reasonCodes: step.blockedReasonCodes,
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      const activeAllocations = await transaction.materialAllocation.findMany({
        where: { workOrderId: step.workOrderId, status: "ACTIVE" },
      });
      for (const allocation of activeAllocations) {
        await transaction.materialLot.update({
          where: { id: allocation.materialLotId },
          data: {
            reservedQuantity: { decrement: allocation.quantity },
            onHand: { decrement: allocation.quantity },
            consumedQuantity: { increment: allocation.quantity },
          },
        });
        await transaction.materialAllocation.update({
          where: { id: allocation.id },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
            closedReason: "FULFILLED",
          },
        });
      }

      await transaction.processStepExecution.update({
        where: { id: stepId },
        data: { readiness: "IN_PROGRESS", startedAt: new Date() },
      });
      await transaction.workOrder.update({
        where: { id: step.workOrderId },
        data: { status: "IN_PROGRESS", currentStepName: step.processStepName },
      });
      const order = await transaction.workOrder.findUnique({
        where: { id: step.workOrderId },
        select: { orderNumber: true },
      });
      await transaction.auditEvent.create({
        data: {
          occurredAt: new Date(),
          actorId: actor.userId,
          actorRole: actor.activeRole,
          actorName: actor.displayName,
          action: "PROCESS_STARTED",
          entityType: "WORK_ORDER",
          entityId: order?.orderNumber ?? step.workOrderId,
          summary: `${step.processStepName} 공정 시작 (${step.productionLotNumber})`,
          requestId: `req-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        },
      });
    });

    return { ok: true as const };
  }

  async complete(
    stepId: string,
    input: { goodQuantity?: unknown; defectQuantity?: unknown; memo?: unknown },
    actor: CommandActor,
  ) {
    const step = await this.prisma.processStepExecution.findUnique({
      where: { id: stepId },
    });
    if (step === null) {
      throw new NotFoundException({
        code: "PROCESS_STEP_NOT_FOUND",
        message: "공정을 찾을 수 없습니다.",
      });
    }
    if (step.readiness !== "IN_PROGRESS") {
      throw new ConflictException({
        code: "PROCESS_NOT_IN_PROGRESS",
        message: "진행 중인 공정만 완료할 수 있습니다.",
        currentReadiness: step.readiness,
      });
    }

    const goodQuantity = input.goodQuantity;
    const defectQuantity = input.defectQuantity;
    if (
      typeof goodQuantity !== "number" ||
      !Number.isInteger(goodQuantity) ||
      goodQuantity < 0
    ) {
      throw invalidInput("양품 수량은 0 이상 정수여야 합니다.");
    }
    if (
      typeof defectQuantity !== "number" ||
      !Number.isInteger(defectQuantity) ||
      defectQuantity < 0
    ) {
      throw invalidInput("불량 수량은 0 이상 정수여야 합니다.");
    }
    if (goodQuantity + defectQuantity < 1) {
      throw invalidInput("양품과 불량의 합계는 1 이상이어야 합니다.");
    }
    let memo: string | undefined;
    if (
      input.memo !== undefined &&
      input.memo !== null &&
      input.memo !== ""
    ) {
      if (typeof input.memo !== "string" || input.memo.length > 300) {
        throw invalidInput("메모는 300자 이하여야 합니다.");
      }
      memo = input.memo;
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.processStepExecution.update({
        where: { id: stepId },
        data: {
          readiness: "COMPLETED",
          completedAt: new Date(),
          goodQuantity,
          defectQuantity,
          ...(memo !== undefined ? { executionMemo: memo } : {}),
        },
      });

      const following = await transaction.processStepExecution.findMany({
        where: { workOrderId: step.workOrderId, readiness: "WAITING" },
        orderBy: { sequence: "asc" },
      });
      const next = following[0];

      const gatingInspections = await transaction.inspection.findMany({
        where: {
          workOrderId: step.workOrderId,
          gate: "ROUTE_ADVANCE",
          processStepName: step.processStepName,
          executionStatus: { not: "CANCELLED" },
        },
      });
      const reasonCodes: string[] = [];
      for (const inspection of gatingInspections) {
        if (inspection.executionStatus !== "COMPLETED") {
          reasonCodes.push("INSPECTION_PENDING");
          break;
        }
        if (inspection.verdict === "FAIL") {
          reasonCodes.push("INSPECTION_FAILED");
          break;
        }
        if (inspection.verdict === "HOLD") {
          reasonCodes.push("INSPECTION_HELD");
          break;
        }
      }

      if (next !== undefined && reasonCodes.length === 0) {
        await transaction.processStepExecution.update({
          where: { id: next.id },
          data: { readiness: "READY" },
        });
      } else if (next !== undefined && reasonCodes.length > 0) {
        await transaction.processStepExecution.update({
          where: { id: next.id },
          data: { readiness: "BLOCKED", blockedReasonCodes: reasonCodes },
        });
      }

      const siblings = await transaction.processStepExecution.findMany({
        where: { workOrderId: step.workOrderId },
        orderBy: { sequence: "asc" },
      });
      const completedCount = siblings.filter((row) => row.readiness === "COMPLETED").length;
      const nextOpen = siblings.find(
        (row) => row.readiness !== "COMPLETED",
      );
      await transaction.workOrder.update({
        where: { id: step.workOrderId },
        data: {
          progressPercent: Math.round((completedCount / siblings.length) * 100),
          currentStepName: nextOpen?.processStepName ?? null,
        },
      });

      const order = await transaction.workOrder.findUnique({
        where: { id: step.workOrderId },
        select: { orderNumber: true },
      });
      await transaction.auditEvent.create({
        data: {
          occurredAt: new Date(),
          actorId: actor.userId,
          actorRole: actor.activeRole,
          actorName: actor.displayName,
          action: "PROCESS_COMPLETED",
          entityType: "WORK_ORDER",
          entityId: order?.orderNumber ?? step.workOrderId,
          summary: `${step.processStepName} 공정 완료 — 양품 ${goodQuantity}·불량 ${defectQuantity} (${step.productionLotNumber})`,
          requestId: `req-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        },
      });
    });

    return { ok: true as const };
  }
}
