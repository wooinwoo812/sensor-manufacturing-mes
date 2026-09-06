import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import type {
  QualityIncidentSourceType,
  QualityIncidentStatus,
} from "../generated/prisma/enums.js";
import { PrismaService } from "../database/prisma.service.js";
import { auditSummary } from "../audit-events/audit-summary.js";
import type { CommandActor } from "../work-orders/work-orders.service.js";
import {
  QUALITY_INCIDENT_SORT_FIELDS,
  QUALITY_INCIDENT_SOURCE_TYPES,
  QUALITY_INCIDENT_STATUSES,
  type QualityIncidentDetail,
  type QualityIncidentListItem,
  type QualityIncidentListResult,
  type QualityIncidentSortField,
} from "./quality-incidents.contract.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const INCIDENT_NUMBER_PREFIX = "QI-";

interface QualityIncidentQuery {
  q?: string;
  status: readonly QualityIncidentStatus[];
  sourceType: readonly QualityIncidentSourceType[];
  sort: QualityIncidentSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

function invalidQuery(detail: string) {
  return new BadRequestException({
    code: "INVALID_QUALITY_INCIDENT_QUERY",
    message: "부적합 사건 조회 조건이 올바르지 않습니다.",
    detail,
  });
}

function invalidInput(message: string) {
  return new BadRequestException({
    code: "INVALID_QUALITY_INCIDENT_INPUT",
    message,
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
export class QualityIncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  parseQuery(query: Record<string, string | string[] | undefined>): QualityIncidentQuery {
    const read = (key: string): string | undefined => {
      const value = query[key];
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined || first === "" ? undefined : first;
    };

    const status = parseEnumArray(
      read("status"),
      QUALITY_INCIDENT_STATUSES,
      "status",
    );
    const sourceType = parseEnumArray(
      read("sourceType"),
      QUALITY_INCIDENT_SOURCE_TYPES,
      "sourceType",
    );

    const sortRaw = (read("sort") ?? "detectedAt") as QualityIncidentSortField;
    if (!QUALITY_INCIDENT_SORT_FIELDS.includes(sortRaw)) {
      throw invalidQuery(`sort에 허용되지 않는 값: ${sortRaw}`);
    }

    const orderRaw = read("order") ?? "desc";
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
      status,
      sourceType,
      sort: sortRaw,
      order: orderRaw,
      page,
      pageSize,
    };
  }

  async list(query: QualityIncidentQuery): Promise<QualityIncidentListResult> {
    const where = this.buildWhere(query);
    const { rows, total } = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.qualityIncident.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.qualityIncident.count({ where });
      return { rows, total };
    });

    return {
      items: rows.map((row) => this.toListItem(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async detail(id: string): Promise<QualityIncidentDetail> {
    const incident = await this.prisma.qualityIncident.findUnique({
      where: { id },
    });
    if (incident === null) {
      throw new NotFoundException({
        code: "QUALITY_INCIDENT_NOT_FOUND",
        message: "부적합 사건을 찾을 수 없습니다.",
      });
    }
    const audits = await this.prisma.auditEvent.findMany({
      where: {
        entityType: "QUALITY_INCIDENT",
        entityId: incident.incidentNumber,
      },
      orderBy: { occurredAt: "desc" },
      take: 10,
    });

    return {
      ...this.toListItem(incident),
      audits: audits.map((event) => ({
        id: event.id,
        action: event.action,
        actorName: event.actorName,
        summary: event.summary,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  }

  async register(
    input: {
      title?: unknown;
      sourceType?: unknown;
      sourceLotNumber?: unknown;
      description?: unknown;
    },
    actor: CommandActor,
  ): Promise<QualityIncidentListItem> {
    const title = input.title;
    if (typeof title !== "string" || title.trim().length < 4 || title.length > 120) {
      throw invalidInput("사건 제목은 4자 이상 120자 이하여야 합니다.");
    }
    const sourceType = input.sourceType;
    if (
      typeof sourceType !== "string" ||
      !QUALITY_INCIDENT_SOURCE_TYPES.includes(
        sourceType as (typeof QUALITY_INCIDENT_SOURCE_TYPES)[number],
      )
    ) {
      throw invalidInput(
        "사건 대상 유형은 MATERIAL_LOT, PRODUCTION_LOT, FINISHED_UNIT 중 하나여야 합니다.",
      );
    }
    const sourceLotNumber = input.sourceLotNumber;
    if (typeof sourceLotNumber !== "string" || sourceLotNumber.trim() === "") {
      throw invalidInput("사건 대상 식별번호를 입력해 주세요.");
    }
    let description: string | undefined;
    if (
      input.description !== undefined &&
      input.description !== null &&
      input.description !== ""
    ) {
      if (
        typeof input.description !== "string" ||
        input.description.length > 500
      ) {
        throw invalidInput("사건 설명은 500자 이하여야 합니다.");
      }
      description = input.description;
    }

    const created = await this.prisma.$transaction(async (transaction) => {
      const quarantined =
        sourceType === "MATERIAL_LOT"
          ? await this.quarantineMaterialLot(
              transaction,
              sourceLotNumber,
              actor,
            )
          : null;

      const year = new Date().getFullYear();
      const count = await transaction.qualityIncident.count();
      const incidentNumber = `${INCIDENT_NUMBER_PREFIX}${year}-${String(
        count + 702,
      ).padStart(4, "0")}`;

      const incident = await transaction.qualityIncident.create({
        data: {
          incidentNumber,
          title: title.trim(),
          sourceType: sourceType as QualityIncidentSourceType,
          sourceLotNumber: sourceLotNumber.trim(),
          ...(description !== undefined ? { description } : {}),
          status: "OPEN",
          detectedAt: new Date(),
        },
      });

      await transaction.auditEvent.create({
        data: {
          occurredAt: new Date(),
          actorId: actor.userId,
          actorRole: actor.activeRole,
          actorName: actor.displayName,
          action: "QUALITY_INCIDENT_REGISTERED",
          entityType: "QUALITY_INCIDENT",
          entityId: incident.incidentNumber,
          summary: auditSummary(`${incident.title} (${incident.sourceLotNumber}) 부적합 사건 등록${description === undefined ? "" : ` — ${description}`}`),
          requestId: `req-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        },
      });

      return { incident, quarantined };
    });

    void created.quarantined;
    return this.toListItem(created.incident);
  }

  private async quarantineMaterialLot(
    transaction: Prisma.TransactionClient,
    lotNumber: string,
    actor: CommandActor,
  ): Promise<{ lotNumber: string; materialName: string }> {
    const lot = await transaction.materialLot.findUnique({
      where: { lotNumber },
      include: { material: true },
    });
    if (lot === null) {
      throw new NotFoundException({
        code: "MATERIAL_LOT_NOT_FOUND",
        message: "자재 LOT을 찾을 수 없습니다.",
      });
    }
    if (lot.qualityDisposition === "REJECTED") {
      throw new BadRequestException({
        code: "MATERIAL_LOT_ALREADY_REJECTED",
        message:
          "이미 폐기 처분된 자재 LOT은 새 부적합 사건으로 통제할 수 없습니다.",
      });
    }
    if (lot.qualityDisposition !== "QUARANTINED") {
      await transaction.materialLot.update({
        where: { id: lot.id },
        data: { qualityDisposition: "QUARANTINED" },
      });
      await transaction.auditEvent.create({
        data: {
          occurredAt: new Date(),
          actorId: actor.userId,
          actorRole: actor.activeRole,
          actorName: actor.displayName,
          action: "MATERIAL_LOT_DISPOSITION_DECIDED",
          entityType: "MATERIAL_LOT",
          entityId: lot.lotNumber,
          summary: `${lot.material.name} ${lot.lotNumber} 부적합 사건 등록에 따라 격리 (${lot.qualityDisposition} → QUARANTINED)`,
          requestId: `req-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        },
      });
    }
    return { lotNumber: lot.lotNumber, materialName: lot.material.name };
  }

  private buildWhere(query: QualityIncidentQuery): Prisma.QualityIncidentWhereInput {
    const where: Prisma.QualityIncidentWhereInput = {};
    if (query.q) {
      where.OR = [
        { incidentNumber: { contains: query.q, mode: "insensitive" } },
        { title: { contains: query.q, mode: "insensitive" } },
        { sourceLotNumber: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.status.length > 0) {
      where.status = { in: [...query.status] };
    }
    if (query.sourceType.length > 0) {
      where.sourceType = { in: [...query.sourceType] };
    }
    return where;
  }

  private buildOrderBy(
    query: QualityIncidentQuery,
  ): Prisma.QualityIncidentOrderByWithRelationInput[] {
    return [{ [query.sort]: query.order }, { incidentNumber: "asc" }];
  }

  private toListItem(row: {
    id: string;
    incidentNumber: string;
    title: string;
    sourceType: QualityIncidentSourceType;
    sourceLotNumber: string;
    description: string | null;
    status: QualityIncidentStatus;
    detectedAt: Date;
    resolvedAt: Date | null;
    createdAt: Date;
  }): QualityIncidentListItem {
    return {
      id: row.id,
      incidentNumber: row.incidentNumber,
      title: row.title,
      sourceType: row.sourceType,
      sourceLotNumber: row.sourceLotNumber,
      description: row.description,
      status: row.status,
      detectedAt: row.detectedAt.toISOString(),
      resolvedAt: row.resolvedAt === null ? null : row.resolvedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
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
