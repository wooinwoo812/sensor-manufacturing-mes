import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  WORK_ORDER_DUE_FILTERS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_SORT_FIELDS,
  WORK_ORDER_STATUSES,
  type WorkOrderDueFilter,
  type WorkOrderListItem,
  type WorkOrderListResult,
  type WorkOrderSortField,
} from "./work-orders.contract.js";
import type { WorkOrderPriority, WorkOrderStatus } from "../generated/prisma/enums.js";
import { DEMO_PRODUCTS } from "./work-order-products.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface WorkOrderQuery {
  q?: string;
  status: readonly WorkOrderStatus[];
  priority: readonly WorkOrderPriority[];
  due: WorkOrderDueFilter;
  blocked: boolean | undefined;
  sort: WorkOrderSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

function invalidQuery(detail: string) {  return new BadRequestException({
    code: "INVALID_WORK_ORDER_QUERY",
    message: "작업지시 조회 조건이 올바르지 않습니다.",
    detail,
  });
}

function parseEnumArray<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  label: string,
): readonly T[] {
  if (raw === undefined || raw === "") {
    return [];
  }
  const values = raw.split(",").map((value) => value.trim());
  for (const value of values) {
    if (!allowed.includes(value as T)) {
      throw invalidQuery(`${label}에 허용되지 않는 값: ${value}`);
    }
  }
  return values as unknown as readonly T[];
}

function seoulStartOfToday(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(Date.parse(`${parts}T00:00:00+09:00`));
}

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  parseQuery(query: Record<string, string | string[] | undefined>): WorkOrderQuery {
    const read = (key: string): string | undefined => {
      const value = query[key];
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined || first === "" ? undefined : first;
    };

    const status = parseEnumArray(read("status"), WORK_ORDER_STATUSES, "status");
    const priority = parseEnumArray(read("priority"), WORK_ORDER_PRIORITIES, "priority");

    const dueRaw = read("due") ?? "all";
    const due = WORK_ORDER_DUE_FILTERS.find((value) => value === dueRaw);
    if (due === undefined) {
      throw invalidQuery(`due에 허용되지 않는 값: ${dueRaw}`);
    }

    const blockedRaw = read("blocked");
    let blocked: boolean | undefined;
    if (blockedRaw !== undefined) {
      if (blockedRaw !== "true" && blockedRaw !== "false") {
        throw invalidQuery(`blocked은 boolean이어야 합니다: ${blockedRaw}`);
      }
      blocked = blockedRaw === "true";
    }

    const sortRaw = (read("sort") ?? "dueDate") as WorkOrderSortField;
    if (!WORK_ORDER_SORT_FIELDS.includes(sortRaw)) {
      throw invalidQuery(`sort에 허용되지 않는 값: ${sortRaw}`);
    }

    const orderRaw = read("order") ?? "asc";
    if (orderRaw !== "asc" && orderRaw !== "desc") {
      throw invalidQuery(`order는 asc 또는 desc여야 합니다: ${orderRaw}`);
    }

    const page = parsePositiveInt(read("page") ?? null, 1, "page");
    const pageSize = parsePositiveInt(read("pageSize") ?? null, DEFAULT_PAGE_SIZE, "pageSize");
    if (pageSize > MAX_PAGE_SIZE) {
      throw invalidQuery(`pageSize는 ${MAX_PAGE_SIZE} 이하여야 합니다.`);
    }

    const q = read("q")?.trim();
    return {
      ...(q ? { q } : {}),
      status,
      priority,
      due,
      blocked,
      sort: sortRaw,
      order: orderRaw,
      page,
      pageSize,
    };
  }

  async list(query: WorkOrderQuery): Promise<WorkOrderListResult> {
    const where = this.buildWhere(query);
    const { rows, total } = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.workOrder.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.workOrder.count({ where });
      return { rows, total };
    });

    return {
      items: rows.map(toListItem),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  products() {
    return DEMO_PRODUCTS.map((product) => ({ ...product }));
  }

  async detail(id: string) {
    const record = await this.prisma.workOrder.findUnique({
      where: { id },
      include: { inspections: true, processSteps: true, inspectionRequirements: true },
    });
    if (record === null) {
      throw new NotFoundException({
        code: "WORK_ORDER_NOT_FOUND",
        message: "작업지시를 찾을 수 없습니다.",
      });
    }
    const recentAudits = await this.prisma.auditEvent.findMany({
      where: { entityType: "WORK_ORDER", entityId: record.orderNumber },
      orderBy: { occurredAt: "desc" },
      take: 10,
    });

    return {
      ...toListItem(record),
      createdAt: record.createdAt.toISOString(),
      steps: record.processSteps
        .sort((left, right) => left.sequence - right.sequence)
        .map((step) => ({
          id: step.id,
          sequence: step.sequence,
          processStepName: step.processStepName,
          productionLotNumber: step.productionLotNumber,
          readiness: step.readiness,
          blockedReasonCodes: step.blockedReasonCodes,
        })),
      inspections: record.inspections
        .sort((left, right) => left.inspectionNumber.localeCompare(right.inspectionNumber))
        .map((inspection) => ({
          id: inspection.id,
          inspectionNumber: inspection.inspectionNumber,
          processStepName: inspection.processStepName,
          gate: inspection.gate,
          specName: inspection.specName,
          executionStatus: inspection.executionStatus,
          verdict: inspection.verdict,
        })),
      inspectionRequirements: record.inspectionRequirements
        .sort((left, right) => left.specName.localeCompare(right.specName))
        .map((requirement) => ({
          id: requirement.id,
          inspectionSpecRevisionId: requirement.inspectionSpecRevisionId,
          specName: requirement.specName,
          gate: requirement.gate,
          processStepName: requirement.processStepName,
        })),
      recentAudits: recentAudits.map((event) => ({
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        actorName: event.actorName,
        actorRole: event.actorRole,
        action: event.action,
        summary: event.summary,
      })),
    };
  }

  async create(
    input: {
      productCode?: unknown;
      plannedQuantity?: unknown;
      dueDate?: unknown;
      priority?: unknown;
      memo?: unknown;
    },
    actor: CommandActor,
  ) {
    const product = DEMO_PRODUCTS.find(
      (candidate) => candidate.code === input.productCode,
    );
    if (product === undefined) {
      throw new BadRequestException({
        code: "INVALID_WORK_ORDER_INPUT",
        message: "작업지시 생성 값이 올바르지 않습니다.",
        detail: `알 수 없는 제품: ${String(input.productCode)}`,
      });
    }
    const plannedQuantity = input.plannedQuantity;
    if (
      typeof plannedQuantity !== "number" ||
      !Number.isInteger(plannedQuantity) ||
      plannedQuantity < 1 ||
      plannedQuantity > 100_000
    ) {
      throw new BadRequestException({
        code: "INVALID_WORK_ORDER_INPUT",
        message: "계획수량은 1 이상 정수여야 합니다.",
      });
    }
    if (typeof input.dueDate !== "string") {
      throw new BadRequestException({
        code: "INVALID_WORK_ORDER_INPUT",
        message: "납기를 지정해 주세요.",
      });
    }
    const dueDate = new Date(`${input.dueDate}T17:00:00+09:00`);
    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException({
        code: "INVALID_WORK_ORDER_INPUT",
        message: "납기 형식이 올바르지 않습니다.",
      });
    }
    if (dueDate.getTime() < seoulStartOfToday().getTime()) {
      throw new BadRequestException({
        code: "INVALID_WORK_ORDER_INPUT",
        message: "납기는 오늘 이후여야 합니다.",
      });
    }
    const priority = input.priority;
    if (
      typeof priority !== "string" ||
      !WORK_ORDER_PRIORITIES.includes(priority as WorkOrderPriority)
    ) {
      throw new BadRequestException({
        code: "INVALID_WORK_ORDER_INPUT",
        message: "우선순위가 올바르지 않습니다.",
      });
    }
    if (input.memo !== undefined && input.memo !== null && input.memo !== "") {
      if (typeof input.memo !== "string" || input.memo.length > 500) {
        throw new BadRequestException({
          code: "INVALID_WORK_ORDER_INPUT",
          message: "메모는 500자 이하여야 합니다.",
        });
      }
    }

    const orderNumber = await this.nextOrderNumber();
    const record = await this.prisma.workOrder.create({
      data: {
        orderNumber,
        productCode: product.code,
        productName: product.name,
        plannedQuantity,
        unit: product.unit,
        dueDate,
        status: "DRAFT",
        priority: priority as WorkOrderPriority,
        ...(typeof input.memo === "string" && input.memo !== ""
          ? { memo: input.memo }
          : {}),
      },
    });

    await this.recordAudit(record.orderNumber, "WORK_ORDER_CREATED", actor, {
      summary: `${product.name} ${plannedQuantity}${product.unit} 초안 작업지시 생성`,
    });

    return this.detail(record.id);
  }

  async release(id: string, actor: CommandActor) {
    const record = await this.prisma.workOrder.findUnique({ where: { id } });
    if (record === null) {
      throw new NotFoundException({
        code: "WORK_ORDER_NOT_FOUND",
        message: "작업지시를 찾을 수 없습니다.",
      });
    }
    if (record.status !== "DRAFT") {
      throw new ConflictException({
        code: "WORK_ORDER_NOT_DRAFT",
        message: "초안 상태의 작업지시만 발행할 수 있습니다.",
        currentStatus: record.status,
      });
    }
    if (record.dueDate.getTime() < seoulStartOfToday().getTime()) {
      throw new ConflictException({
        code: "WORK_ORDER_RELEASE_INVALID",
        message: "납기가 이미 지나 발행할 수 없습니다.",
      });
    }

    let requirementCount = 0;
    let inspectionSnapshotCount = 0;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.workOrder.update({
        where: { id },
        data: { status: "RELEASED" },
      });

      const publishedSpecs = await transaction.inspectionSpecRevision.findMany({
        where: { productCode: record.productCode, lifecycle: "PUBLISHED" },
        orderBy: { revisionNumber: "asc" },
      });
      for (const spec of publishedSpecs) {
        if (spec.gate === "ROUTE_ADVANCE" && spec.processStepName === null) {
          throw new ConflictException({
            code: "WORK_ORDER_INSPECTION_SPEC_INVALID",
            message: "공정 통과 검사 규격은 대상 공정을 지정해야 합니다.",
            revisionNumber: spec.revisionNumber,
          });
        }
        await transaction.inspectionRequirement.upsert({
          where: {
            workOrderId_inspectionSpecRevisionId: {
              workOrderId: id,
              inspectionSpecRevisionId: spec.id,
            },
          },
          create: {
            workOrderId: id,
            inspectionSpecRevisionId: spec.id,
            specName: spec.specName,
            gate: spec.gate,
            processStepName: spec.processStepName,
          },
          update: {},
        });
        inspectionSnapshotCount += 1;
      }

      if (record.bomRevisionId !== null) {
        const revision = await transaction.bomRevision.findUnique({
          where: { id: record.bomRevisionId },
          include: { items: { include: { material: true } } },
        });
        if (revision === null) {
          throw new ConflictException({
            code: "WORK_ORDER_BOM_REVISION_NOT_FOUND",
            message: "작업지시에 지정된 BOM revision을 찾을 수 없습니다.",
          });
        }
        if (revision.lifecycle !== "PUBLISHED") {
          throw new ConflictException({
            code: "WORK_ORDER_BOM_REVISION_NOT_PUBLISHED",
            message: "발행 상태의 BOM revision만 스냅샷할 수 있습니다.",
            lifecycle: revision.lifecycle,
          });
        }
        const formatScaled = (value: bigint): string => {
          const digits = value.toString().padStart(7, "0");
          return `${digits.slice(0, -6)}.${digits.slice(-6)}`;
        };
        for (const item of revision.items) {
          const perProduct = BigInt(
            item.quantityPerProductBaseUom.toFixed(6).replace(".", ""),
          );
          const requiredScaled = BigInt(record.plannedQuantity) * perProduct;
          await transaction.workOrderMaterialRequirement.upsert({
            where: {
              workOrderId_materialId: {
                workOrderId: id,
                materialId: item.materialId,
              },
            },
            create: {
              workOrderId: id,
              bomRevisionId: revision.id,
              materialId: item.materialId,
              quantityPerProductBaseUom: item.quantityPerProductBaseUom,
              requiredQuantity: formatScaled(requiredScaled),
              unit: item.material.unit,
            },
            update: {},
          });
          requirementCount += 1;
        }
      }
    });
    await this.recordAudit(record.orderNumber, "WORK_ORDER_RELEASED", actor, {
      summary: `${record.productName} ${record.plannedQuantity}${record.unit} 작업지시 발행${requirementCount > 0 ? ` (BOM 스냅샷 ${requirementCount}항목)` : ""}${inspectionSnapshotCount > 0 ? ` (검사규격 스냅샷 ${inspectionSnapshotCount}항목)` : ""}`,
    });

    return this.detail(id);
  }

  async cancel(id: string, reason: unknown, actor: CommandActor) {
    const record = await this.prisma.workOrder.findUnique({
      where: { id },
      include: { processSteps: true },
    });
    if (record === null) {
      throw new NotFoundException({
        code: "WORK_ORDER_NOT_FOUND",
        message: "작업지시를 찾을 수 없습니다.",
      });
    }
    if (record.status !== "DRAFT" && record.status !== "RELEASED") {
      throw new ConflictException({
        code: "WORK_ORDER_NOT_CANCELLABLE",
        message: "실적이 없는 초안·발행 상태만 취소할 수 있습니다.",
        currentStatus: record.status,
      });
    }
    const hasExecution = record.processSteps.some(
      (step) => step.readiness === "IN_PROGRESS" || step.readiness === "COMPLETED",
    );
    if (hasExecution) {
      throw new ConflictException({
        code: "WORK_ORDER_HAS_EXECUTION",
        message: "공정 실적이 있어 취소할 수 없습니다.",
      });
    }
    if (typeof reason !== "string" || reason.trim().length < 2 || reason.length > 500) {
      throw new BadRequestException({
        code: "INVALID_WORK_ORDER_INPUT",
        message: "취소 사유는 2자 이상 500자 이하여야 합니다.",
      });
    }

    await this.prisma.workOrder.update({
      where: { id },
      data: { status: "CANCELLED", blockedReason: null },
    });
    await this.recordAudit(record.orderNumber, "WORK_ORDER_CANCELLED", actor, {
      summary: `작업지시 취소: ${reason.trim()}`,
    });

    return this.detail(id);
  }

  private async nextOrderNumber(): Promise<string> {
    const rows = await this.prisma.workOrder.findMany({
      select: { orderNumber: true },
    });
    const year = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(new Date());
    const prefix = `WO-${year}-`;
    const max = rows.reduce((current, row) => {
      if (!row.orderNumber.startsWith(prefix)) {
        return current;
      }
      const suffix = Number(row.orderNumber.slice(prefix.length));
      return Number.isInteger(suffix) && suffix > current ? suffix : current;
    }, 100);
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  private async recordAudit(
    orderNumber: string,
    action:
      | "WORK_ORDER_CREATED"
      | "WORK_ORDER_RELEASED"
      | "WORK_ORDER_CANCELLED",
    actor: CommandActor,
    { summary }: { summary: string },
  ) {
    await this.prisma.auditEvent.create({
      data: {
        occurredAt: new Date(),
        actorId: actor.userId,
        actorRole: actor.activeRole,
        actorName: actor.displayName,
        action,
        entityType: "WORK_ORDER",
        entityId: orderNumber,
        summary,
        requestId: newRequestId(),
      },
    });
  }

  private buildWhere(query: WorkOrderQuery): Prisma.WorkOrderWhereInput {
    const where: Prisma.WorkOrderWhereInput = {};
    if (query.q) {
      where.OR = [
        { orderNumber: { contains: query.q, mode: "insensitive" } },
        { productCode: { contains: query.q, mode: "insensitive" } },
        { productName: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.status.length > 0) {
      where.status = { in: [...query.status] };
    } else if (query.due === "overdue") {
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
    }
    if (query.priority.length > 0) {
      where.priority = { in: [...query.priority] };
    }
    if (query.blocked !== undefined) {
      where.blockedReason = query.blocked ? { not: null } : null;
    }
    const dueRange = this.dueRange(query.due);
    if (dueRange) {
      where.dueDate = dueRange;
    }
    return where;
  }

  private dueRange(
    due: WorkOrderDueFilter,
  ): Prisma.DateTimeFilter | undefined {
    if (due === "all") {
      return undefined;
    }
    const start = seoulStartOfToday();
    if (due === "overdue") {
      return { lt: start };
    }
    if (due === "today") {
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { gte: start, lt: end };
    }
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { gte: start, lt: end };
  }

  private buildOrderBy(query: WorkOrderQuery): Prisma.WorkOrderOrderByWithRelationInput[] {
    return [{ [query.sort]: query.order }, { orderNumber: "asc" }];
  }
}

function parsePositiveInt(
  raw: string | null,
  fallback: number,
  label: string,
): number {
  if (raw === null || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw invalidQuery(`${label}은 1 이상 정수여야 합니다: ${raw}`);
  }
  return value;
}

function toListItem(row: {
  id: string;
  orderNumber: string;
  productCode: string;
  productName: string;
  plannedQuantity: number;
  unit: string;
  dueDate: Date;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  progressPercent: number;
  currentStepName: string | null;
  blockedReason: string | null;
  memo: string | null;
  createdAt: Date;
}): WorkOrderListItem {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    productCode: row.productCode,
    productName: row.productName,
    plannedQuantity: row.plannedQuantity,
    unit: row.unit,
    dueDate: row.dueDate.toISOString(),
    status: row.status,
    priority: row.priority,
    progressPercent: row.progressPercent,
    currentStepName: row.currentStepName,
    blockedReason: row.blockedReason,
    memo: row.memo,
  };
}

export interface CommandActor {
  userId: string;
  displayName: string;
  activeRole: "PRODUCTION_PLANNER" | "MATERIAL_MANAGER" | "SHOP_FLOOR_OPERATOR" | "QUALITY_ENGINEER" | "SYSTEM_ADMIN";
}

function newRequestId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
