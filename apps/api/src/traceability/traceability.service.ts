import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import {
  TRACE_NODE_TYPES,
  type TraceEdgeView,
  type TraceNodeDetail,
  type TraceNodeListItem,
  type TraceNodeListResult,
  type TraceNodeType,
} from "./traceability.contract.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const TRACE_SORT_FIELDS = [
  "label",
  "createdAt",
  "upstreamCount",
  "downstreamCount",
] as const;

interface TraceNodeQuery {
  q?: string;
  nodeType: readonly TraceNodeType[];
  page: number;
  pageSize: number;
  sort: (typeof TRACE_SORT_FIELDS)[number];
  order: "asc" | "desc";
}

function invalidQuery(detail: string) {
  return new BadRequestException({
    code: "INVALID_TRACE_QUERY",
    message: "추적 노드 조회 조건이 올바르지 않습니다.",
    detail,
  });
}

export function parseTraceNodeQuery(
  query: Record<string, string | string[] | undefined>,
): TraceNodeQuery {
  const read = (key: string): string | undefined => {
    const value = query[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first === undefined || first === "" ? undefined : first;
  };

  let nodeType: readonly TraceNodeType[] = [];
  const nodeTypeRaw = read("nodeType");
  if (nodeTypeRaw !== undefined) {
    const values = nodeTypeRaw.split(",").map((value) => value.trim());
    for (const value of values) {
      if (!TRACE_NODE_TYPES.includes(value as TraceNodeType)) {
        throw invalidQuery(`nodeType에 허용되지 않는 값: ${value}`);
      }
    }
    nodeType = values as unknown as readonly TraceNodeType[];
  }

  const q = read("q");
  const sort = (read("sort") ?? "label") as TraceNodeQuery["sort"];
  if (!TRACE_SORT_FIELDS.includes(sort))
    throw invalidQuery("허용되지 않는 정렬 필드입니다.");
  const order = read("order") ?? "asc";
  if (order !== "asc" && order !== "desc")
    throw invalidQuery("order는 asc 또는 desc여야 합니다.");
  if (q !== undefined && q.length > 24) {
    throw invalidQuery("검색어는 24자 이하여야 합니다.");
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
      throw invalidQuery(
        `pageSize는 1 이상 ${MAX_PAGE_SIZE} 이하 정수여야 합니다.`,
      );
    }
    pageSize = size;
  }

  return {
    ...(q === undefined ? {} : { q }),
    nodeType,
    page,
    pageSize,
    sort,
    order,
  };
}

function toListItem(row: {
  id: string;
  nodeType: TraceNodeType;
  label: string;
  materialLotId: string | null;
  productionLotNumber: string | null;
  createdAt: Date;
  _count: { parentRelations: number; childRelations: number };
}): TraceNodeListItem {
  return {
    id: row.id,
    nodeType: row.nodeType,
    label: row.label,
    materialLotId: row.materialLotId,
    productionLotNumber: row.productionLotNumber,
    upstreamCount: row._count.childRelations,
    downstreamCount: row._count.parentRelations,
    createdAt: row.createdAt.toISOString(),
  };
}

function toEdge(
  relation: {
    id: string;
    relationType: TraceEdgeView["relationType"];
    quantity: number;
    processStepExecutionId: string | null;
    createdAt: Date;
  },
  peer: { id: string; nodeType: TraceNodeType; label: string },
): TraceEdgeView {
  return {
    id: relation.id,
    relationType: relation.relationType,
    quantity: relation.quantity,
    processStepExecutionId: relation.processStepExecutionId,
    createdAt: relation.createdAt.toISOString(),
    node: { id: peer.id, nodeType: peer.nodeType, label: peer.label },
  };
}

@Injectable()
export class TraceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: TraceNodeQuery): Promise<TraceNodeListResult> {
    // childRelations의 peer가 원천, parentRelations의 peer가 산출이다(toListItem과 동일).
    const primary: Prisma.TraceNodeOrderByWithRelationInput =
      query.sort === "upstreamCount"
        ? { childRelations: { _count: query.order } }
        : query.sort === "downstreamCount"
          ? { parentRelations: { _count: query.order } }
          : { [query.sort]: query.order };
    const where = {
      AND: [
        ...(query.q === undefined
          ? []
          : [{ label: { contains: query.q, mode: "insensitive" as const } }]),
        ...(query.nodeType.length === 0
          ? []
          : [{ nodeType: { in: [...query.nodeType] } }]),
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.traceNode.count({ where }),
      this.prisma.traceNode.findMany({
        where,
        orderBy: [primary, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          _count: { select: { parentRelations: true, childRelations: true } },
        },
      }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(id: string): Promise<TraceNodeDetail> {
    const node = await this.prisma.traceNode.findUnique({
      where: { id },
      include: {
        childRelations: {
          orderBy: { createdAt: "asc" },
          include: { parentNode: true },
        },
        parentRelations: {
          orderBy: { createdAt: "asc" },
          include: { childNode: true },
        },
      },
    });
    if (node === null) {
      throw new NotFoundException({
        code: "TRACE_NODE_NOT_FOUND",
        message: "추적 노드를 찾을 수 없습니다.",
      });
    }

    return {
      id: node.id,
      nodeType: node.nodeType,
      label: node.label,
      materialLotId: node.materialLotId,
      productionLotNumber: node.productionLotNumber,
      createdAt: node.createdAt.toISOString(),
      upstream: node.childRelations.map((relation) =>
        toEdge(relation, relation.parentNode),
      ),
      downstream: node.parentRelations.map((relation) =>
        toEdge(relation, relation.childNode),
      ),
    };
  }
}
