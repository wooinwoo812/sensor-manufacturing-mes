import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../database/prisma.service.js";
import type { ProcessReadiness } from "../generated/prisma/enums.js";
import {
  PROCESS_EXECUTION_SORT_FIELDS,
  PROCESS_READINESS_BY_FILTER,
  PROCESS_READINESS_FILTERS,
  type ProcessExecutionDetail,
  type ProcessExecutionListResult,
  type ProcessExecutionSortField,
} from "./process-executions.contract.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface ProcessExecutionQuery {
  q?: string;
  readiness: readonly ProcessReadiness[];
  sort: ProcessExecutionSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

function invalidQuery(detail: string) {
  return new BadRequestException({
    code: "INVALID_PROCESS_EXECUTION_QUERY",
    message: "공정 실행 조회 조건이 올바르지 않습니다.",
    detail,
  });
}

@Injectable()
export class ProcessExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  parseQuery(query: Record<string, string | string[] | undefined>): ProcessExecutionQuery {
    const read = (key: string): string | undefined => {
      const value = query[key];
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined || first === "" ? undefined : first;
    };

    const readinessRaw = read("readiness") ?? "all";
    const readinessFilter = PROCESS_READINESS_FILTERS.find(
      (value) => value === readinessRaw,
    );
    if (readinessFilter === undefined) {
      throw invalidQuery(`readiness에 허용되지 않는 값: ${readinessRaw}`);
    }
    const readiness =
      readinessFilter === "all"
        ? []
        : [PROCESS_READINESS_BY_FILTER[readinessFilter]];

    const sortRaw = (read("sort") ?? "orderNumber") as ProcessExecutionSortField;
    if (!PROCESS_EXECUTION_SORT_FIELDS.includes(sortRaw)) {
      throw invalidQuery(`sort에 허용되지 않는 값: ${sortRaw}`);
    }

    const orderRaw = read("order") ?? "asc";
    if (orderRaw !== "asc" && orderRaw !== "desc") {
      throw invalidQuery(`order는 asc 또는 desc여야 합니다: ${orderRaw}`);
    }

    const page = parsePositiveInt(read("page") ?? null, 1, "page");
    const pageSize = parsePositiveInt(
      read("pageSize") ?? null,
      DEFAULT_PAGE_SIZE,
      "pageSize",
    );
    if (pageSize > MAX_PAGE_SIZE) {
      throw invalidQuery(`pageSize는 ${MAX_PAGE_SIZE} 이하여야 합니다.`);
    }

    const q = read("q")?.trim();
    return {
      ...(q ? { q } : {}),
      readiness,
      sort: sortRaw,
      order: orderRaw,
      page,
      pageSize,
    };
  }

  async list(query: ProcessExecutionQuery): Promise<ProcessExecutionListResult> {
    const where = this.buildWhere(query);
    const { rows, total } = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.processStepExecution.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        include: { workOrder: true },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.processStepExecution.count({ where });
      return { rows, total };
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        workOrderNumber: row.workOrder.orderNumber,
        productCode: row.workOrder.productCode,
        productName: row.workOrder.productName,
        plannedQuantity: row.workOrder.plannedQuantity,
        unit: row.workOrder.unit,
        dueDate: row.workOrder.dueDate.toISOString(),
        sequence: row.sequence,
        processStepName: row.processStepName,
        productionLotNumber: row.productionLotNumber,
        readiness: row.readiness,
        blockedReasonCodes: row.blockedReasonCodes,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async detail(stepId: string): Promise<ProcessExecutionDetail> {
    const step = await this.prisma.processStepExecution.findUnique({
      where: { id: stepId },
      include: { workOrder: true },
    });
    if (step === null) {
      throw new NotFoundException({
        code: "PROCESS_STEP_NOT_FOUND",
        message: "공정을 찾을 수 없습니다.",
      });
    }
    const inspections = await this.prisma.inspection.findMany({
      where: {
        workOrderId: step.workOrderId,
        processStepName: step.processStepName,
        executionStatus: { not: "CANCELLED" },
      },
      orderBy: { inspectionNumber: "asc" },
    });

    return {
      id: step.id,
      workOrderNumber: step.workOrder.orderNumber,
      productCode: step.workOrder.productCode,
      productName: step.workOrder.productName,
      plannedQuantity: step.workOrder.plannedQuantity,
      unit: step.workOrder.unit,
      dueDate: step.workOrder.dueDate.toISOString(),
      sequence: step.sequence,
      processStepName: step.processStepName,
      productionLotNumber: step.productionLotNumber,
      readiness: step.readiness,
      blockedReasonCodes: step.blockedReasonCodes,
      startedAt: step.startedAt?.toISOString() ?? null,
      completedAt: step.completedAt?.toISOString() ?? null,
      goodQuantity: step.goodQuantity,
      defectQuantity: step.defectQuantity,
      executionMemo: step.executionMemo,
      inspections: inspections.map((inspection) => ({
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        gate: inspection.gate,
        executionStatus: inspection.executionStatus,
        verdict: inspection.verdict,
      })),
    };
  }

  private buildWhere(query: ProcessExecutionQuery): Prisma.ProcessStepExecutionWhereInput {
    const where: Prisma.ProcessStepExecutionWhereInput = {};
    if (query.q) {
      where.OR = [
        { productionLotNumber: { contains: query.q, mode: "insensitive" } },
        { processStepName: { contains: query.q, mode: "insensitive" } },
        {
          workOrder: {
            OR: [
              { orderNumber: { contains: query.q, mode: "insensitive" } },
              { productName: { contains: query.q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }
    if (query.readiness.length > 0) {
      where.readiness = { in: [...query.readiness] };
    }
    return where;
  }

  private buildOrderBy(
    query: ProcessExecutionQuery,
  ): Prisma.ProcessStepExecutionOrderByWithRelationInput[] {
    if (query.sort === "orderNumber") {
      return [
        { workOrder: { orderNumber: query.order } },
        { sequence: query.order },
      ];
    }
    return [{ [query.sort]: query.order }, { workOrder: { orderNumber: "asc" } }];
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
