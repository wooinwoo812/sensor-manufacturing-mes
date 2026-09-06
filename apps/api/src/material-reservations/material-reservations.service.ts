import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";
import { computeAvailableQuantity } from "../material-lots/material-lots.service.js";
import { productionTransaction, refreshMaterialReadiness, refreshProductionFlow } from "../process-executions/production-flow.js";

export interface MaterialReservationView {
  id: string;
  lotNumber: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  status: "ACTIVE" | "CLOSED";
  closedReason: string | null;
  createdAt: string;
}

function badRequest(message: string) {
  return new BadRequestException({
    code: "INVALID_MATERIAL_RESERVATION_INPUT",
    message,
  });
}

@Injectable()
export class MaterialReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workOrderId: string): Promise<MaterialReservationView[]> {
    const order = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true },
    });
    if (order === null) {
      throw new NotFoundException({
        code: "WORK_ORDER_NOT_FOUND",
        message: "작업지시를 찾을 수 없습니다.",
      });
    }
    const rows = await this.prisma.materialAllocation.findMany({
      where: { workOrderId },
      orderBy: { createdAt: "desc" },
      include: {
        materialLot: { include: { material: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      lotNumber: row.materialLot.lotNumber,
      materialCode: row.materialLot.material.code,
      materialName: row.materialLot.material.name,
      unit: row.materialLot.material.unit,
      quantity: row.quantity,
      status: row.status,
      closedReason: row.closedReason,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async reserve(
    workOrderId: string,
    input: { materialLotId?: unknown; quantity?: unknown },
    actor: CommandActor,
  ): Promise<MaterialReservationView[]> {
    if (typeof input.materialLotId !== "string" || input.materialLotId === "") {
      throw badRequest("예약할 자재 LOT을 선택해 주세요.");
    }
    const quantity = input.quantity;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      throw badRequest("예약 수량은 1 이상 정수여야 합니다.");
    }

    await productionTransaction(this.prisma, async (transaction) => {
      const order = await transaction.workOrder.findUnique({
        where: { id: workOrderId },
        select: { id: true, orderNumber: true, status: true },
      });
      if (order === null) {
        throw new NotFoundException({
          code: "WORK_ORDER_NOT_FOUND",
          message: "작업지시를 찾을 수 없습니다.",
        });
      }
      if (order.status !== "RELEASED") {
        throw new ConflictException({
          code: "RESERVATION_NOT_RELEASED",
          message: "발행 상태의 작업지시만 자재를 예약할 수 있습니다.",
          currentStatus: order.status,
        });
      }

      const lot = await transaction.materialLot.findUnique({
        where: { id: input.materialLotId as string },
        include: { material: true },
      });
      if (lot === null) {
        throw new NotFoundException({
          code: "MATERIAL_LOT_NOT_FOUND",
          message: "자재 LOT을 찾을 수 없습니다.",
        });
      }

      const available = computeAvailableQuantity(lot);
      if (
        lot.qualityDisposition !== "ACCEPTED" ||
        lot.expiresAt !== null
      ) {
        if (lot.qualityDisposition !== "ACCEPTED") {
          throw new ConflictException({
            code: "MATERIAL_LOT_UNAVAILABLE",
            message: "품질 통제 중인 자재 LOT는 예약할 수 없습니다.",
            disposition: lot.qualityDisposition,
          });
        }
        if (lot.expiresAt !== null && lot.expiresAt.getTime() <= Date.now()) {
          throw new ConflictException({
            code: "MATERIAL_LOT_UNAVAILABLE",
            message: "만료된 자재 LOT는 예약할 수 없습니다.",
          });
        }
      }
      if (available < quantity) {
        throw new ConflictException({
          code: "MATERIAL_LOT_INSUFFICIENT",
          message: `가용 수량(${available})을 초과해 예약할 수 없습니다.`,
          available,
        });
      }

      const requirements = await transaction.workOrderMaterialRequirement.findMany({ where: { workOrderId } });
      if (requirements.length > 0) {
        const requirement = requirements.find((row) => row.materialId === lot.materialId);
        const allocations = await transaction.materialAllocation.findMany({ where: { workOrderId, status: "ACTIVE" }, include: { materialLot: true } });
        const reserved = allocations.filter((row) => row.materialLot.materialId === lot.materialId).reduce((sum, row) => sum + row.quantity, 0);
        if (!requirement || reserved + quantity > Math.ceil(Number(requirement.requiredQuantity))) {
          throw new ConflictException({ code: "MATERIAL_REQUIREMENT_EXCEEDED", message: "이 작업지시의 BOM 자재와 남은 필요 수량 안에서 예약해 주세요." });
        }
      }

      await transaction.materialLot.update({
        where: { id: lot.id },
        data: { reservedQuantity: { increment: quantity } },
      });
      await transaction.materialAllocation.create({
        data: {
          workOrderId,
          materialLotId: lot.id,
          quantity,
          status: "ACTIVE",
        },
      });
      await transaction.auditEvent.create({
          data: {
            occurredAt: new Date(),
            actorId: actor.userId,
            actorRole: actor.activeRole,
            actorName: actor.displayName,
            action: "MATERIAL_RESERVED",
            entityType: "WORK_ORDER",
            entityId: order.orderNumber,
            summary: `${lot.material.name} ${lot.lotNumber} ${quantity}${lot.material.unit} 예약`,
            requestId: `req-${Date.now().toString(36)}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
          },
        });
      await refreshMaterialReadiness(transaction, workOrderId);
      await refreshProductionFlow(transaction, workOrderId);
    });

    return this.list(workOrderId);
  }

  async release(
    allocationId: string,
    actor: CommandActor,
  ): Promise<MaterialReservationView[]> {
    const released = await productionTransaction(this.prisma, async (transaction) => {
      const allocation = await transaction.materialAllocation.findUnique({
        where: { id: allocationId },
      });
      if (allocation === null) {
        throw new NotFoundException({
          code: "MATERIAL_ALLOCATION_NOT_FOUND",
          message: "예약을 찾을 수 없습니다.",
        });
      }
      if (allocation.status !== "ACTIVE") {
        throw new ConflictException({
          code: "MATERIAL_ALLOCATION_NOT_ACTIVE",
          message: "이미 종료된 예약은 해제할 수 없습니다.",
        });
      }

      await transaction.materialLot.update({
        where: { id: allocation.materialLotId },
        data: { reservedQuantity: { decrement: allocation.quantity } },
      });
      const closed = await transaction.materialAllocation.update({
        where: { id: allocationId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedReason: "RELEASED",
        },
      });
      const order = await transaction.workOrder.findUnique({
        where: { id: allocation.workOrderId },
        select: { orderNumber: true },
      });
      const lot = await transaction.materialLot.findUnique({
        where: { id: allocation.materialLotId },
        include: { material: true },
      });
      await transaction.auditEvent.create({
        data: {
          occurredAt: new Date(),
          actorId: actor.userId,
          actorRole: actor.activeRole,
          actorName: actor.displayName,
          action: "MATERIAL_RESERVATION_RELEASED",
          entityType: "WORK_ORDER",
          entityId: order?.orderNumber ?? allocation.workOrderId,
          summary: `${lot?.material.name ?? ""} ${lot?.lotNumber ?? ""} 예약 ${closed.quantity}${lot?.material.unit ?? ""} 해제`,
          requestId: `req-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        },
      });
      await refreshMaterialReadiness(transaction, allocation.workOrderId);
      await refreshProductionFlow(transaction, allocation.workOrderId);
      return allocation.workOrderId;
    });

    return this.list(released);
  }
}
