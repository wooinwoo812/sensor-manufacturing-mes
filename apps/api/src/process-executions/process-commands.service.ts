import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";
import { outputQuantityLimit, productionTransaction, refreshMaterialReadiness, refreshProductionFlow } from "./production-flow.js";

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
    await productionTransaction(this.prisma, async (transaction) => {
      let step = await transaction.processStepExecution.findUnique({
        where: { id: stepId },
      });
      if (step === null) {
        throw new NotFoundException({
          code: "PROCESS_STEP_NOT_FOUND",
          message: "공정을 찾을 수 없습니다.",
        });
      }
      const orderState = await transaction.workOrder.findUnique({ where: { id: step.workOrderId } });
      if (!orderState || !["RELEASED", "IN_PROGRESS"].includes(orderState.status)) {
        throw new ConflictException({ code: "WORK_ORDER_NOT_EXECUTABLE", message: "발행 또는 진행 중인 작업지시만 실행할 수 있습니다." });
      }
      await refreshMaterialReadiness(transaction, step.workOrderId);
      await refreshProductionFlow(transaction, step.workOrderId);
      step = (await transaction.processStepExecution.findUnique({ where: { id: stepId } }))!;
      if (step.readiness !== "READY") {
        throw new ConflictException({
          code: "PROCESS_NOT_READY",
          message: "실행 가능 상태의 공정만 시작할 수 있습니다.",
          currentReadiness: step.readiness,
          reasonCodes: step.blockedReasonCodes,
        });
      }

      const activeAllocations = await transaction.materialAllocation.findMany({
        where: { workOrderId: step.workOrderId, status: "ACTIVE" },
      });
      const productionNode = await transaction.traceNode.upsert({
        where: { productionLotNumber: step.productionLotNumber },
        create: {
          nodeType: "PRODUCTION_LOT",
          label: step.productionLotNumber,
          productionLotNumber: step.productionLotNumber,
        },
        update: {},
      });
      for (const allocation of activeAllocations) {
        const reservedLot = await transaction.materialLot.findUnique({ where: { id: allocation.materialLotId } });
        if (!reservedLot || reservedLot.qualityDisposition !== "ACCEPTED" || (reservedLot.expiresAt !== null && reservedLot.expiresAt.getTime() <= Date.now()) || reservedLot.onHand < allocation.quantity || reservedLot.reservedQuantity < allocation.quantity) {
          throw new ConflictException({ code: "MATERIAL_LOT_UNAVAILABLE", message: "예약한 자재의 품질·만료·재고가 변경되었습니다. 자재 예약을 다시 확인해 주세요." });
        }
        const lot = await transaction.materialLot.update({
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
        const materialNode = await transaction.traceNode.upsert({
          where: { materialLotId: lot.id },
          create: {
            nodeType: "MATERIAL_LOT",
            label: lot.lotNumber,
            materialLotId: lot.id,
          },
          update: { label: lot.lotNumber },
        });
        await transaction.lotRelation.upsert({
          where: {
            relationType_parentNodeId_childNodeId: {
              relationType: "CONSUME",
              parentNodeId: materialNode.id,
              childNodeId: productionNode.id,
            },
          },
          create: {
            relationType: "CONSUME",
            quantity: allocation.quantity,
            parentNodeId: materialNode.id,
            childNodeId: productionNode.id,
            processStepExecutionId: stepId,
          },
          update: {
            quantity: { increment: allocation.quantity },
            processStepExecutionId: stepId,
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
    return productionTransaction(this.prisma, async (transaction) => {
      const step = await transaction.processStepExecution.findUnique({
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
      const orderState = await transaction.workOrder.findUnique({ where: { id: step.workOrderId } });
      if (!orderState || orderState.status !== "IN_PROGRESS") {
        throw new ConflictException({ code: "WORK_ORDER_NOT_EXECUTABLE", message: "진행 중인 작업지시만 실적을 기록할 수 있습니다." });
      }
      const steps = await transaction.processStepExecution.findMany({ where: { workOrderId: step.workOrderId }, orderBy: { sequence: "asc" } });
      const limit = outputQuantityLimit(step, steps, orderState.plannedQuantity);
      if (limit === null || goodQuantity + defectQuantity !== limit) {
        throw new BadRequestException({ code: "PROCESS_QUANTITY_MISMATCH", message: limit === null ? "선행 공정의 완료 실적을 먼저 확인해 주세요." : `양품과 불량의 합계는 이번 공정 투입량 ${limit}개와 같아야 합니다.`, inputQuantity: limit });
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

      await refreshProductionFlow(transaction, step.workOrderId);

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
      return { ok: true as const };
    });
  }
}
