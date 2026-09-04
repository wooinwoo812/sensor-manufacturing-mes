import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../database/prisma.service.js";
import type { AuditAction, RoleCode } from "../generated/prisma/enums.js";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_ROLES,
  AUDIT_SORT_FIELDS,
  type AuditEventListResult,
  type AuditSortField,
} from "./audit-events.contract.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface AuditEventQuery {
  q?: string;
  actorId?: string;
  actorRole: readonly RoleCode[];
  action: readonly AuditAction[];
  entityType?: string;
  entityId?: string;
  requestId?: string;
  from?: Date;
  to?: Date;
  sort: AuditSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

function invalidQuery(detail: string) {
  return new BadRequestException({
    code: "INVALID_AUDIT_EVENT_QUERY",
    message: "감사 이벤트 조회 조건이 올바르지 않습니다.",
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

function parseIsoDate(raw: string | undefined, label: string): Date | undefined {
  if (raw === undefined || raw === "") {
    return undefined;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidQuery(`${label}는 ISO 8601 시각이어야 합니다: ${raw}`);
  }
  return parsed;
}

@Injectable()
export class AuditEventsService {
  constructor(private readonly prisma: PrismaService) {}

  parseQuery(query: Record<string, string | string[] | undefined>): AuditEventQuery {
    const read = (key: string): string | undefined => {
      const value = query[key];
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined || first === "" ? undefined : first;
    };

    const actorRole = parseEnumArray(read("actorRole"), AUDIT_ACTOR_ROLES, "actorRole");
    const action = parseEnumArray(read("action"), AUDIT_ACTIONS, "action");

    const sortRaw = (read("sort") ?? "occurredAt") as AuditSortField;
    if (!AUDIT_SORT_FIELDS.includes(sortRaw)) {
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
    const actorId = read("actorId");
    const entityType = read("entityType");
    const entityId = read("entityId");
    const requestId = read("requestId");
    const from = parseIsoDate(read("from"), "from");
    const to = parseIsoDate(read("to"), "to");

    return stripUndefined({
      ...(q ? { q } : {}),
      ...(actorId ? { actorId } : {}),
      actorRole,
      action,
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(requestId ? { requestId } : {}),
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
      sort: sortRaw,
      order: orderRaw,
      page,
      pageSize,
    });
  }

  async list(query: AuditEventQuery): Promise<AuditEventListResult> {
    const where = this.buildWhere(query);
    const { rows, total } = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.auditEvent.findMany({
        where,
        orderBy: [{ [query.sort]: query.order }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.auditEvent.count({ where });
      return { rows, total };
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        actorId: row.actorId,
        actorRole: row.actorRole,
        actorName: row.actorName,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        requestId: row.requestId,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  private buildWhere(query: AuditEventQuery): Prisma.AuditEventWhereInput {
    const where: Prisma.AuditEventWhereInput = {};
    if (query.q) {
      where.OR = [
        { summary: { contains: query.q, mode: "insensitive" } },
        { entityId: { contains: query.q, mode: "insensitive" } },
        { actorName: { contains: query.q, mode: "insensitive" } },
        { requestId: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.actorId !== undefined) {
      where.actorId = query.actorId;
    }
    if (query.actorRole.length > 0) {
      where.actorRole = { in: [...query.actorRole] };
    }
    if (query.action.length > 0) {
      where.action = { in: [...query.action] };
    }
    if (query.entityType !== undefined) {
      where.entityType = query.entityType;
    }
    if (query.entityId !== undefined) {
      where.entityId = query.entityId;
    }
    if (query.requestId !== undefined) {
      where.requestId = query.requestId;
    }
    if (query.from !== undefined || query.to !== undefined) {
      where.occurredAt = {
        ...(query.from !== undefined ? { gte: query.from } : {}),
        ...(query.to !== undefined ? { lte: query.to } : {}),
      };
    }
    return where;
  }
}

function stripUndefined(value: AuditEventQuery): AuditEventQuery {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as unknown as AuditEventQuery;
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
