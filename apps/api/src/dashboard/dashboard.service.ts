import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { dashboardCalendar } from "./dashboard-calendar.js";
import type {
  DashboardAttentionItem,
  DashboardSummary,
  DashboardWeeklyPoint,
} from "./dashboard.contract.js";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<DashboardSummary> {
    const now = Date.now();
    const { todayStart, tomorrowStart, weekStart, weekEnd } = dashboardCalendar(new Date(now));
    const [
      workOrders,
      lots,
      inspections,
      materialLots,
      weekOrders,
    ] = await this.prisma.$transaction(async (transaction) => {
      const workOrders = await transaction.workOrder.findMany();
      const lots = await transaction.processStepExecution.findMany({
        select: { productionLotNumber: true, readiness: true },
      });
      const inspections = await transaction.inspection.findMany({
        select: {
          workOrderId: true,
          inspectionNumber: true,
          productionLotNumber: true,
          gate: true,
          executionStatus: true,
          verdict: true,
        },
      });
      const materialLots = await transaction.materialLot.findMany({
        select: {
          qualityDisposition: true,
          expiresAt: true,
          onHand: true,
          reservedQuantity: true,
        },
      });
      const weekOrders = await transaction.workOrder.findMany({
        where: {
          status: { not: "CANCELLED" },
          dueDate: { gte: weekStart, lt: weekEnd },
        },
        select: { dueDate: true, plannedQuantity: true, progressPercent: true },
      });
      return [workOrders, lots, inspections, materialLots, weekOrders] as const;
    });

    const metrics = {
      workOrders: {
        inProgress: workOrders.filter((order) => order.status === "IN_PROGRESS").length,
        released: workOrders.filter((order) => order.status === "RELEASED").length,
        draft: workOrders.filter((order) => order.status === "DRAFT").length,
        completed: workOrders.filter((order) => order.status === "COMPLETED").length,
        cancelled: workOrders.filter((order) => order.status === "CANCELLED").length,
        overdue: workOrders.filter(
          (order) =>
            order.status !== "COMPLETED" &&
            order.status !== "CANCELLED" &&
            order.dueDate.getTime() < todayStart.getTime(),
        ).length,
        blocked: workOrders.filter((order) => order.blockedReason !== null).length,
      },
      productionLots: {
        distinct: new Set(lots.map((lot) => lot.productionLotNumber)).size,
        inProgress: new Set(
          lots
            .filter((lot) => lot.readiness === "IN_PROGRESS")
            .map((lot) => lot.productionLotNumber),
        ).size,
      },
      inspections: {
        pending: inspections.filter((row) => row.executionStatus === "PENDING").length,
        inProgress: inspections.filter((row) => row.executionStatus === "IN_PROGRESS").length,
        failed: inspections.filter((row) => row.verdict === "FAIL").length,
        hold: inspections.filter((row) => row.verdict === "HOLD").length,
      },
      materialLots: {
        quarantined: materialLots.filter((row) => row.qualityDisposition === "QUARANTINED")
          .length,
        shortage: materialLots.filter(
          (row) =>
            row.qualityDisposition === "ACCEPTED" &&
            (row.expiresAt === null || row.expiresAt.getTime() > now) &&
            Math.max(row.onHand - row.reservedQuantity, 0) === 0,
        ).length,
        expired: materialLots.filter(
          (row) => row.expiresAt !== null && row.expiresAt.getTime() <= now,
        ).length,
      },
    };

    const weekly = this.buildWeekly(weekOrders, weekStart);
    const planned = weekly.reduce((sum, point) => sum + point.plannedQuantity, 0);
    const progress = weekly.reduce((sum, point) => sum + point.progressQuantity, 0);

    return {
      demoCases: workOrders.filter(order => order.memo?.startsWith("[PORTFOLIO-V1:")).map(order => ({
        id: order.id, orderNumber: order.orderNumber, label: order.memo!.replace(/^\[PORTFOLIO-V1:[A-Z]+\]\s*/, ""),
        scenario: /^\[PORTFOLIO-V1:([A-Z]+)\]/.exec(order.memo!)?.[1] ?? "",
        hasHeldInspection: inspections.some(inspection => inspection.workOrderId === order.id && inspection.executionStatus === "COMPLETED" && inspection.verdict === "HOLD"),
        status: order.status, progressPercent: order.progressPercent, blockedReason: order.blockedReason,
      })).sort((a, b) => a.orderNumber.localeCompare(b.orderNumber)),
      metrics,
      weekly,
      weeklyTotals: {
        planned,
        progress,
        completionRate: planned === 0 ? 0 : Number(((progress / planned) * 100).toFixed(1)),
      },
      attentionQueue: this.buildAttentionQueue(
        workOrders,
        inspections,
        todayStart,
        tomorrowStart,
      ),
    };
  }

  private buildWeekly(
    weekOrders: { dueDate: Date; plannedQuantity: number; progressPercent: number }[],
    weekStart: Date,
  ): DashboardWeeklyPoint[] {
    const points: DashboardWeeklyPoint[] = WEEKDAY_LABELS.map((weekday) => ({
      weekday,
      plannedQuantity: 0,
      progressQuantity: 0,
    }));
    for (const order of weekOrders) {
      const dayIndex = Math.floor(
        (order.dueDate.getTime() - weekStart.getTime()) / 86_400_000,
      );
      const point = dayIndex >= 0 && dayIndex <= 6 ? points[dayIndex] : undefined;
      if (point === undefined) {
        continue;
      }
      point.plannedQuantity += order.plannedQuantity;
      point.progressQuantity += Math.round(
        (order.plannedQuantity * order.progressPercent) / 100,
      );
    }
    return points;
  }

  private buildAttentionQueue(
    workOrders: {
      orderNumber: string;
      status: string;
      dueDate: Date;
      blockedReason: string | null;
      progressPercent: number;
    }[],
    inspections: {
      inspectionNumber: string;
      productionLotNumber: string;
      gate: string;
      executionStatus: string;
    }[],
    todayStart: Date,
    tomorrowStart: Date,
  ): DashboardAttentionItem[] {
    const items: DashboardAttentionItem[] = [];

    const blocked = workOrders.filter((order) => order.blockedReason !== null);
    for (const order of blocked) {
      items.push({
        code: order.orderNumber,
        context: `납기 ${this.formatDate(order.dueDate)}`,
        reason: `작업지시가 차단됐습니다: ${order.blockedReason ?? ""}`,
        status: "차단",
        tone: "danger",
      });
    }

    const pendingFinalInspections = inspections.filter(
      (inspection) =>
        inspection.executionStatus === "PENDING" && inspection.gate === "LOT_COMPLETE",
    );
    for (const inspection of pendingFinalInspections.slice(0, 2)) {
      items.push({
        code: inspection.productionLotNumber,
        context: `검사 ${inspection.inspectionNumber}`,
        reason: "LOT 완료 게이트 최종검사가 판정을 기다리고 있습니다.",
        status: "검사 대기",
        tone: "warning",
      });
    }

    const dueToday = workOrders.filter(
      (order) =>
        order.status === "IN_PROGRESS" &&
        order.dueDate.getTime() >= todayStart.getTime() &&
        order.dueDate.getTime() < tomorrowStart.getTime(),
    );
    for (const order of dueToday.slice(0, 2)) {
      items.push({
        code: order.orderNumber,
        context: `진행률 ${order.progressPercent}% · 납기 ${this.formatDate(order.dueDate)}`,
        reason: "오늘이 납기인 작업지시가 진행 중입니다.",
        status: "납기 임박",
        tone: "warning",
      });
    }

    return items.slice(0, 5);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}
