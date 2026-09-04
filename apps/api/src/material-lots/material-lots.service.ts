import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../database/prisma.service.js";
import type { QualityDisposition } from "../generated/prisma/enums.js";
import {
  MATERIAL_LOT_AVAILABILITY_FILTERS,
  MATERIAL_LOT_DISPOSITIONS,
  MATERIAL_LOT_SORT_FIELDS,
  type MaterialLotAvailabilityFilter,
  type MaterialLotListItem,
  type MaterialLotListResult,
  type MaterialLotSortField,
} from "./material-lots.contract.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface MaterialLotQuery {
  q?: string;
  materialId?: string;
  disposition: readonly QualityDisposition[];
  availability: MaterialLotAvailabilityFilter;
  sort: MaterialLotSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

function invalidQuery(detail: string) {
  return new BadRequestException({
    code: "INVALID_MATERIAL_LOT_QUERY",
    message: "자재 LOT 조회 조건이 올바르지 않습니다.",
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

export function computeAvailableQuantity(lot: {
  onHand: number;
  reservedQuantity: number;
  qualityDisposition: QualityDisposition;
  expiresAt: Date | null;
  now?: Date;
}): number {
  const now = lot.now ?? new Date();
  const notExpired = lot.expiresAt === null || lot.expiresAt.getTime() > now.getTime();
  if (lot.qualityDisposition !== "ACCEPTED" || !notExpired) {
    return 0;
  }
  return Math.max(lot.onHand - lot.reservedQuantity, 0);
}

@Injectable()
export class MaterialLotsService {
  constructor(private readonly prisma: PrismaService) {}

  parseQuery(query: Record<string, string | string[] | undefined>): MaterialLotQuery {
    const read = (key: string): string | undefined => {
      const value = query[key];
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined || first === "" ? undefined : first;
    };

    const disposition = parseEnumArray(
      read("disposition"),
      MATERIAL_LOT_DISPOSITIONS,
      "disposition",
    );

    const availabilityRaw = read("availability") ?? "all";
    const availability = MATERIAL_LOT_AVAILABILITY_FILTERS.find(
      (value) => value === availabilityRaw,
    );
    if (availability === undefined) {
      throw invalidQuery(`availability에 허용되지 않는 값: ${availabilityRaw}`);
    }

    const sortRaw = (read("sort") ?? "receivedAt") as MaterialLotSortField;
    if (!MATERIAL_LOT_SORT_FIELDS.includes(sortRaw)) {
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
    const materialId = read("materialId");
    return {
      ...(q ? { q } : {}),
      ...(materialId ? { materialId } : {}),
      disposition,
      availability,
      sort: sortRaw,
      order: orderRaw,
      page,
      pageSize,
    };
  }

  async list(query: MaterialLotQuery): Promise<MaterialLotListResult> {
    const computedAvailability =
      query.availability === "available" || query.availability === "shortage";

    if (computedAvailability) {
      const rows = await this.prisma.materialLot.findMany({
        where: this.buildWhere(query),
        orderBy: this.buildOrderBy(query),
        include: { material: true },
      });
      const filtered = rows.filter((row) =>
        this.matchesAvailability(row, query.availability),
      );
      const start = (query.page - 1) * query.pageSize;
      return {
        items: filtered
          .slice(start, start + query.pageSize)
          .map((row) => this.toListItem(row)),
        page: query.page,
        pageSize: query.pageSize,
        total: filtered.length,
      };
    }

    const where = this.buildWhere(query);
    const { rows, total } = await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.materialLot.findMany({
        where,
        orderBy: this.buildOrderBy(query),
        include: { material: true },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const total = await transaction.materialLot.count({ where });
      return { rows, total };
    });

    return {
      items: rows.map((row) => this.toListItem(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  private buildWhere(query: MaterialLotQuery): Prisma.MaterialLotWhereInput {
    const where: Prisma.MaterialLotWhereInput = {};
    if (query.q) {
      where.OR = [
        { lotNumber: { contains: query.q, mode: "insensitive" } },
        {
          material: {
            OR: [
              { code: { contains: query.q, mode: "insensitive" } },
              { name: { contains: query.q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }
    if (query.materialId) {
      where.materialId = query.materialId;
    }
    if (query.disposition.length > 0) {
      where.qualityDisposition = { in: [...query.disposition] };
    }
    if (query.availability === "expired") {
      where.expiresAt = { lt: new Date() };
    }
    return where;
  }

  private buildOrderBy(
    query: MaterialLotQuery,
  ): Prisma.MaterialLotOrderByWithRelationInput[] {
    if (query.sort === "expiresAt") {
      return [{ expiresAt: { sort: query.order, nulls: "last" } }, { lotNumber: "asc" }];
    }
    return [{ [query.sort]: query.order }, { lotNumber: "asc" }];
  }

  private matchesAvailability(
    row: {
      onHand: number;
      reservedQuantity: number;
      qualityDisposition: QualityDisposition;
      expiresAt: Date | null;
    },
    availability: MaterialLotAvailabilityFilter,
  ): boolean {
    const available = computeAvailableQuantity(row);
    if (availability === "available") {
      return available > 0;
    }
    if (availability === "shortage") {
      return (
        row.qualityDisposition === "ACCEPTED" &&
        (row.expiresAt === null || row.expiresAt.getTime() > Date.now()) &&
        available === 0
      );
    }
    if (availability === "expired") {
      return row.expiresAt !== null && row.expiresAt.getTime() <= Date.now();
    }
    return true;
  }

  private toListItem(row: {
    id: string;
    lotNumber: string;
    receivedQuantity: number;
    onHand: number;
    reservedQuantity: number;
    consumedQuantity: number;
    scrappedQuantity: number;
    qualityDisposition: QualityDisposition;
    expiresAt: Date | null;
    receivedAt: Date;
    material: { code: string; name: string; unit: string };
  }): MaterialLotListItem {
    return {
      id: row.id,
      lotNumber: row.lotNumber,
      materialCode: row.material.code,
      materialName: row.material.name,
      unit: row.material.unit,
      receivedQuantity: row.receivedQuantity,
      onHand: row.onHand,
      reservedQuantity: row.reservedQuantity,
      consumedQuantity: row.consumedQuantity,
      scrappedQuantity: row.scrappedQuantity,
      availableQuantity: computeAvailableQuantity(row),
      qualityDisposition: row.qualityDisposition,
      expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
      receivedAt: row.receivedAt.toISOString(),
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
