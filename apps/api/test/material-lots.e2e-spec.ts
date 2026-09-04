import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { AppModule } from "../src/app.module.js";
import { AuthModule } from "../src/auth/auth.module.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/auth/demo-accounts.js";
import { hashPassword } from "../src/auth/password.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { DEMO_MATERIAL_LOTS, DEMO_MATERIALS } from "../prisma/demo-material-lots.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

interface FakeMaterialLotRow {
  id: string;
  lotNumber: string;
  materialId: string;
  receivedQuantity: number;
  onHand: number;
  reservedQuantity: number;
  consumedQuantity: number;
  scrappedQuantity: number;
  qualityDisposition: string;
  expiresAt: Date | null;
  receivedAt: Date;
  material: { code: string; name: string; unit: string };
}

interface FakeSessionRow {
  id: string;
  tokenHash: string;
  csrfToken: string;
  userId: string;
  activeRole: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

class FakePrismaService {
  private sequence = 0;
  readonly users: {
    id: string;
    email: string;
    displayName: string;
    passwordHash: string;
    isActive: boolean;
    roles: { roleCode: string }[];
  }[];
  readonly sessions: FakeSessionRow[] = [];
  readonly materialLots: FakeMaterialLotRow[] = DEMO_MATERIAL_LOTS.map((lot, index) => {
    const material = DEMO_MATERIALS.find((item) => item.code === lot.materialCode);
    if (material === undefined) {
      throw new Error(`테스트 자재 없음: ${lot.materialCode}`);
    }
    return {
      ...lot,
      qualityDisposition: lot.qualityDisposition,
      id: `material-lot-${index + 1}`,
      materialId: `material-${lot.materialCode}`,
      material,
    };
  });

  constructor() {
    this.users = DEMO_ACCOUNTS.map((account) => ({
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      passwordHash,
      isActive: true,
      roles: [{ roleCode: account.role }],
    }));
  }

  readonly user = {
    findUnique: async ({ where }: { where: { email: string } }) =>
      this.users.find((user) => user.email === where.email) ?? null,
  };

  readonly session = {
    create: async ({ data }: { data: Omit<FakeSessionRow, "id" | "revokedAt"> }) => {
      const session = { ...data, id: `session-${++this.sequence}`, revokedAt: null };
      this.sessions.push(session);
      return session;
    },
    findUnique: async ({ where }: { where: { tokenHash: string } }) => {
      const session = this.sessions.find(
        (candidate) => candidate.tokenHash === where.tokenHash,
      );
      if (session === undefined) {
        return null;
      }
      const user = this.users.find((candidate) => candidate.id === session.userId);
      if (user === undefined) {
        return null;
      }
      return { ...session, userRole: { user } };
    },
    updateMany: async () => ({ count: 0 }),
  };

  readonly materialLot = {
    findMany: async ({
      where = {},
      orderBy = [],
      skip = 0,
      take = Number.POSITIVE_INFINITY,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown>[];
      skip?: number;
      take?: number;
    }) =>
      applyOrderBy(
        this.materialLots.filter((row) => matchesWhere(row, where)),
        orderBy,
      ).slice(skip, skip + take),
    count: async ({ where = {} }: { where?: Record<string, unknown> }) =>
      this.materialLots.filter((row) => matchesWhere(row, where)).length,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

function conditionMatches(
  row: FakeMaterialLotRow,
  condition: unknown,
  field: string,
): boolean {
  if (field === "material") {
    const materialWhere = condition as { OR?: Record<string, { contains: string }>[] };
    return (
      materialWhere.OR?.some((clause) =>
        Object.entries(clause).some(([key, filter]) =>
          String(row.material[key as "code" | "name"])
            .toLowerCase()
            .includes(filter.contains.toLowerCase()),
        ),
      ) ?? true
    );
  }

  const value = row[field as keyof FakeMaterialLotRow];
  if (condition === null) {
    return value === null;
  }
  if (typeof condition === "object" && condition !== null) {
    const filter = condition as Record<string, unknown>;
    if ("in" in filter) {
      return (filter.in as unknown[]).includes(value);
    }
    if ("contains" in filter) {
      return String(value)
        .toLowerCase()
        .includes(String(filter.contains).toLowerCase());
    }
    if ("lt" in filter) {
      const bound = filter.lt instanceof Date ? filter.lt : new Date(String(filter.lt));
      return value instanceof Date && value < bound;
    }
    return false;
  }
  return value === condition;
}

function matchesWhere(row: FakeMaterialLotRow, where: Record<string, unknown>) {
  for (const [field, condition] of Object.entries(where)) {
    if (field === "OR") {
      const anyMatch = (condition as Record<string, unknown>[]).some((alternative) =>
        matchesWhere(row, alternative),
      );
      if (!anyMatch) {
        return false;
      }
      continue;
    }
    if (!conditionMatches(row, condition, field)) {
      return false;
    }
  }
  return true;
}

function applyOrderBy(rows: FakeMaterialLotRow[], orderBy: Record<string, unknown>[]) {
  return [...rows].sort((left, right) => {
    for (const clause of orderBy) {
      for (const [field, rawDirection] of Object.entries(clause)) {
        const direction =
          typeof rawDirection === "string"
            ? rawDirection
            : ((rawDirection as { sort: "asc" | "desc" }).sort);
        const nullsLast =
          typeof rawDirection === "object" &&
          (rawDirection as { nulls?: string }).nulls === "last";
        const leftValue = left[field as keyof FakeMaterialLotRow];
        const rightValue = right[field as keyof FakeMaterialLotRow];
        if (leftValue === null || rightValue === null) {
          if (leftValue !== rightValue) {
            const leftNull = leftValue === null;
            return nullsLast ? (leftNull ? 1 : -1) : leftNull ? -1 : 1;
          }
          continue;
        }
        let comparison: number;
        if (leftValue instanceof Date && rightValue instanceof Date) {
          comparison = leftValue.getTime() - rightValue.getTime();
        } else if (typeof leftValue === "number" && typeof rightValue === "number") {
          comparison = leftValue - rightValue;
        } else {
          comparison = String(leftValue).localeCompare(String(rightValue));
        }
        if (comparison !== 0) {
          return direction === "asc" ? comparison : -comparison;
        }
      }
    }
    return 0;
  });
}

describe("material lot list API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "material-lot-e2e-salt");
  });

  beforeEach(async () => {
    process.env.WEB_ORIGIN = allowedOrigin;
    process.env.NODE_ENV = "test";

    const testingModule = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new FakePrismaService())
      .compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
    }
  });

  afterAll(() => {
    delete process.env.WEB_ORIGIN;
    delete process.env.NODE_ENV;
  });

  async function loginAs(roleCode: string) {
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === roleCode);
    expect(account).toBeDefined();
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account?.email, password: DEMO_PASSWORD })
      .expect(200);
    return agent;
  }

  it("세션 없이는 자재 LOT를 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/material-lots")
      .set("Origin", allowedOrigin)
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_REQUIRED"));
  });

  it("자재 읽기 권한이 없는 역할은 403으로 거부된다", async () => {
    const operator = await loginAs("SHOP_FLOOR_OPERATOR");
    await operator
      .get("/api/material-lots")
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("기본 목록은 자재 LOT 전체를 최근 입고 순서로 반환한다", async () => {
    const agent = await loginAs("MATERIAL_MANAGER");
    const response = await agent
      .get("/api/material-lots")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(DEMO_MATERIAL_LOTS.length);
    expect(response.body.items[0].lotNumber).toBe("ML-2026-0312");
    expect(response.body.items[0]).toMatchObject({
      materialCode: "SEN-MAT-021",
      availableQuantity: 0,
    });
  });

  it("가용량은 품질 disposition과 만료에 따라 계산된다", async () => {
    const agent = await loginAs("MATERIAL_MANAGER");
    const response = await agent
      .get("/api/material-lots")
      .set("Origin", allowedOrigin)
      .expect(200);

    const byLot = new Map<string, (typeof response.body.items)[number]>(
      (response.body.items as { lotNumber: string }[]).map(
        (item) => [item.lotNumber, item] as const,
      ),
    );
    expect(byLot.get("ML-2026-0301").availableQuantity).toBe(200);
    expect(byLot.get("ML-2026-0302").availableQuantity).toBe(0);
    expect(byLot.get("ML-2026-0303").availableQuantity).toBe(0);
    expect(byLot.get("ML-2026-0323").availableQuantity).toBe(0);
  });

  it("availability 필터는 available·shortage·expired를 구분한다", async () => {
    const agent = await loginAs("MATERIAL_MANAGER");

    const available = await agent
      .get("/api/material-lots")
      .query({ availability: "available" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(available.body.total).toBe(4);
    for (const item of available.body.items) {
      expect(item.availableQuantity).toBeGreaterThan(0);
    }

    const shortage = await agent
      .get("/api/material-lots")
      .query({ availability: "shortage" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(
      (shortage.body.items as { lotNumber: string }[]).map((item) => item.lotNumber),
    ).toEqual(["ML-2026-0302"]);

    const expired = await agent
      .get("/api/material-lots")
      .query({ availability: "expired" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(
      (expired.body.items as { lotNumber: string }[]).map((item) => item.lotNumber),
    ).toEqual(["ML-2026-0303"]);
  });

  it("disposition 필터는 enum array를 지원한다", async () => {
    const agent = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/material-lots")
      .query({ disposition: "QUARANTINED,HOLD" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(2);
    for (const item of response.body.items) {
      expect(["QUARANTINED", "HOLD"]).toContain(item.qualityDisposition);
    }
  });

  it("q 검색은 LOT 번호와 자재 코드·명을 포괄한다", async () => {
    const agent = await loginAs("MATERIAL_MANAGER");
    const response = await agent
      .get("/api/material-lots")
      .query({ q: "쿨링" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(3);
    for (const item of response.body.items) {
      expect(item.materialName).toContain("쿨링");
    }
  });

  it("허용되지 않은 조회 조건은 400으로 거부한다", async () => {
    const agent = await loginAs("MATERIAL_MANAGER");
    await agent
      .get("/api/material-lots")
      .query({ disposition: "BROKEN" })
      .set("Origin", allowedOrigin)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_MATERIAL_LOT_QUERY"));
  });
});
