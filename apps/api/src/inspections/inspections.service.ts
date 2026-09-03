import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../database/prisma.service.js";
import type {
  InspectionExecutionStatus,
  InspectionGate,
  InspectionVerdict,
} from "../generated/prisma/enums.js";
import {
  INSPECTION_EXECUTION_STATUSES,
  INSPECTION_GATES,
  INSPECTION_SORT_FIELDS,
  INSPECTION_VERDICTS,
  type InspectionListResult,
  type InspectionSortField,
} from "./inspections.contract.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface InspectionQuery {
  q?: string;
  executionStatus: readonly InspectionExecutionStatus[];
  verdict: readonly InspectionVerdict[];
  gate: readonly InspectionGate[];
  sort: InspectionSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

function invalidQuery(detail: string) {
  return new BadRequestException({
    code: "INVALID_INSPECTION_QUERY",
    message: "검사 조회 조건이 올바르지 않습니다.",
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

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  parseQuery(query: Record<string, string | string[] | undefined>): InspectionQuery {
    const read = (key: string): string | undefined => {
      const value = query[key];
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined || first === "" ? undefined : first;
    };

    const executionStatus = parseEnumArray(
      read("executionStatus"),
      INSPECTION_EXECUTION_STATUSES,
      "executionStatus",
    );
    const verdict = parseEnumArray(read("verdict"), INSPECTION_VERDICTS, "verdict");
    const gate = parseEnumArray(read("gate"), INSPECTION_GATES, "gate");

    const sortRaw = (read("sort") ?? "createdAt") as InspectionSortField;
    if (!INSPECTION_SORT_FIELDS.includes(sortRaw)) {
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
      executionStatus,
      verdict,
      gate,
      sort: sortRaw,
      order: orderRaw,
      page,
      pageSize,
    };
  }

  async list(query: InspectionQuery): Promise<InspectionListResult> {
    const where = this.buildWhere(query);
    const { rows, total } = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.inspection.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        include: { workOrder: true },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.inspection.count({ where });
      return { rows, total };
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        inspectionNumber: row.inspectionNumber,
        workOrderNumber: row.workOrder.orderNumber,
        productCode: row.workOrder.productCode,
        productName: row.workOrder.productName,
        productionLotNumber: row.productionLotNumber,
        processStepName: row.processStepName,
        gate: row.gate,
        specName: row.specName,
        executionStatus: row.executionStatus,
        verdict: row.verdict,
        completedAt: row.completedAt === null ? null : row.completedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  private buildWhere(query: InspectionQuery): Prisma.InspectionWhereInput {
    const where: Prisma.InspectionWhereInput = {};
    if (query.q) {
      where.OR = [
        { inspectionNumber: { contains: query.q, mode: "insensitive" } },
        { productionLotNumber: { contains: query.q, mode: "insensitive" } },
        { processStepName: { contains: query.q, mode: "insensitive" } },
        { specName: { contains: query.q, mode: "insensitive" } },
        {
          workOrder: { orderNumber: { contains: query.q, mode: "insensitive" } },
        },
      ];
    }
    if (query.executionStatus.length > 0) {
      where.executionStatus = { in: [...query.executionStatus] };
    }
    if (query.verdict.length > 0) {
      where.verdict = { in: [...query.verdict] };
    }
    if (query.gate.length > 0) {
      where.gate = { in: [...query.gate] };
    }
    return where;
  }

  private buildOrderBy(query: InspectionQuery): Prisma.InspectionOrderByWithRelationInput[] {
    if (query.sort === "completedAt") {
      return [
        { completedAt: { sort: query.order, nulls: "last" } },
        { inspectionNumber: "asc" },
      ];
    }
    return [{ [query.sort]: query.order }, { inspectionNumber: "asc" }];
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
