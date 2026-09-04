import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import {
  BOM_LIFECYCLES,
  type BomLifecycle,
  type BomRevisionListItem,
  type BomRevisionListResult,
} from "./boms.contract.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface BomQuery {
  q?: string;
  lifecycle: readonly BomLifecycle[];
  productId?: string;
  page: number;
  pageSize: number;
}

function invalidQuery(detail: string) {
  return new BadRequestException({
    code: "INVALID_BOM_QUERY",
    message: "BOM 조회 조건이 올바르지 않습니다.",
    detail,
  });
}

export function parseBomQuery(
  query: Record<string, string | string[] | undefined>,
): BomQuery {
  const read = (key: string): string | undefined => {
    const value = query[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first === undefined || first === "" ? undefined : first;
  };

  let lifecycle: readonly BomLifecycle[] = [];
  const lifecycleRaw = read("lifecycle");
  if (lifecycleRaw !== undefined) {
    const values = lifecycleRaw.split(",").map((value) => value.trim());
    for (const value of values) {
      if (!BOM_LIFECYCLES.includes(value as BomLifecycle)) {
        throw invalidQuery(`lifecycle에 허용되지 않는 값: ${value}`);
      }
    }
    lifecycle = values as unknown as readonly BomLifecycle[];
  }

  const q = read("q");
  if (q !== undefined && q.length > 40) {
    throw invalidQuery("검색어는 40자 이하여야 합니다.");
  }

  const pageRaw = read("page");
  let page = 1;
  if (pageRaw !== undefined) {
    if (!Number.isInteger(Number(pageRaw)) || Number(pageRaw) < 1) {
      throw invalidQuery("page는 1 이상 정수여야 합니다.");
    }
    page = Number(pageRaw);
  }

  const pageSizeRaw = read("pageSize");
  let pageSize = DEFAULT_PAGE_SIZE;
  if (pageSizeRaw !== undefined) {
    const size = Number(pageSizeRaw);
    if (!Number.isInteger(size) || size < 1 || size > MAX_PAGE_SIZE) {
      throw invalidQuery(`pageSize는 1 이상 ${MAX_PAGE_SIZE} 이하 정수여야 합니다.`);
    }
    pageSize = size;
  }

  return {
    ...(q === undefined ? {} : { q }),
    lifecycle,
    ...(read("productId") === undefined
      ? {}
      : { productId: read("productId")! }),
    page,
    pageSize,
  };
}

@Injectable()
export class BomsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: BomQuery): Promise<BomRevisionListResult> {
    const where = {
      AND: [
        ...(query.q === undefined
          ? []
          : [
              {
                OR: [
                  {
                    revisionNumber: {
                      contains: query.q,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    product: {
                      OR: [
                        {
                          code: { contains: query.q, mode: "insensitive" as const },
                        },
                        {
                          name: { contains: query.q, mode: "insensitive" as const },
                        },
                      ],
                    },
                  },
                ],
              },
            ]),
        ...(query.lifecycle.length === 0
          ? []
          : [{ lifecycle: { in: [...query.lifecycle] } }]),
        ...(query.productId === undefined ? [] : [{ productId: query.productId }]),
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.bomRevision.count({ where }),
      this.prisma.bomRevision.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { revisionNumber: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          product: true,
          items: {
            orderBy: { material: { code: "asc" } },
            include: { material: true },
          },
        },
      }),
    ]);

    return {
      items: rows.map(
        (row): BomRevisionListItem => ({
          id: row.id,
          revisionNumber: row.revisionNumber,
          productId: row.product.id,
          productCode: row.product.code,
          productName: row.product.name,
          productBaseUom: row.product.baseUom,
          lifecycle: row.lifecycle,
          description: row.description,
          items: row.items.map((item) => ({
            id: item.id,
            materialId: item.materialId,
            materialCode: item.material.code,
            materialName: item.material.name,
            materialUnit: item.material.unit,
            quantityPerProductBaseUom:
              item.quantityPerProductBaseUom.toString(),
          })),
          createdAt: row.createdAt.toISOString(),
        }),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
