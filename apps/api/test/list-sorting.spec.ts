import { describe, expect, it, vi } from "vitest";
import { BomsService, parseBomQuery } from "../src/boms/boms.service.js";
import {
  TraceabilityService,
  parseTraceNodeQuery,
} from "../src/traceability/traceability.service.js";
import type { PrismaService } from "../src/database/prisma.service.js";

describe.each([
  ["BOM", parseBomQuery],
  ["LOT 계보", parseTraceNodeQuery],
] as const)("%s 정렬 입력", (_name, parse) => {
  it.each(["__proto__", "id;DROP TABLE", "unsupported"])(
    "허용하지 않은 필드 %s를 거부한다",
    (sort) => {
      expect(() => parse({ sort })).toThrow("조회 조건이 올바르지 않습니다");
    },
  );
  it("잘못된 방향을 거부한다", () => {
    expect(() => parse({ order: "sideways" })).toThrow(
      "조회 조건이 올바르지 않습니다",
    );
  });
});

it("BOM 제품 정렬은 DB 관계 필드에 적용하고 페이지를 자르기 전 동률을 해소한다", async () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const db = {
    bomRevision: { findMany, count: vi.fn().mockResolvedValue(41) },
  } as unknown as PrismaService;
  const result = await new BomsService(db).search(
    parseBomQuery({
      q: "센서",
      sort: "productName",
      order: "desc",
      page: "2",
      pageSize: "10",
    }),
  );
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      skip: 10,
      take: 10,
      orderBy: [
        { product: { name: "desc" } },
        { revisionNumber: "asc" },
        { id: "asc" },
      ],
    }),
  );
  expect(result.total).toBe(41);
});

it.each([
  ["upstreamCount", "childRelations"],
  ["downstreamCount", "parentRelations"],
])(
  "계보 %s는 표시되는 투입/산출 방향의 관계 수를 정렬한다",
  async (sort, relation) => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db = {
      traceNode: { findMany, count: vi.fn().mockResolvedValue(21) },
    } as unknown as PrismaService;
    await new TraceabilityService(db).search(
      parseTraceNodeQuery({ sort, order: "desc", page: "2", pageSize: "10" }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ [relation]: { _count: "desc" } }, { id: "asc" }],
      }),
    );
  },
);
