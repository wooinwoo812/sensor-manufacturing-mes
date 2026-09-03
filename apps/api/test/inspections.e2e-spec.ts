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
import { DEMO_INSPECTIONS } from "../prisma/demo-inspections.js";
import { DEMO_WORK_ORDERS } from "../prisma/demo-work-orders.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

interface FakeInspectionRow {
  id: string;
  inspectionNumber: string;
  workOrderId: string;
  productionLotNumber: string;
  processStepName: string;
  gate: string;
  specName: string;
  executionStatus: string;
  verdict: string | null;
  completedAt: Date | null;
  createdAt: Date;
  workOrder: {
    orderNumber: string;
    productCode: string;
    productName: string;
  };
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
  readonly inspections: FakeInspectionRow[] = DEMO_INSPECTIONS.map((inspection, index) => {
    const order = DEMO_WORK_ORDERS.find(
      (candidate) => candidate.orderNumber === inspection.workOrderNumber,
    );
    if (order === undefined) {
      throw new Error(`테스트 작업지시 없음: ${inspection.workOrderNumber}`);
    }
    return {
      ...inspection,
      gate: inspection.gate,
      executionStatus: inspection.executionStatus,
      id: `inspection-${index + 1}`,
      workOrderId: `work-order-${inspection.workOrderNumber}`,
      createdAt: new Date(Date.now() - (DEMO_INSPECTIONS.length - index) * 3_600_000),
      workOrder: {
        orderNumber: order.orderNumber,
        productCode: order.productCode,
        productName: order.productName,
      },
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

  readonly inspection = {
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
        this.inspections.filter((row) => matchesWhere(row, where)),
        orderBy,
      ).slice(skip, skip + take),
    count: async ({ where = {} }: { where?: Record<string, unknown> }) =>
      this.inspections.filter((row) => matchesWhere(row, where)).length,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

function matchesWhere(row: FakeInspectionRow, where: Record<string, unknown>) {
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
    const value = row[field as keyof FakeInspectionRow];
    if (typeof condition === "object" && condition !== null) {
      const filter = condition as Record<string, unknown>;
      if ("in" in filter) {
        if (!(filter.in as unknown[]).includes(value)) {
          return false;
        }
        continue;
      }
      if ("contains" in filter) {
        if (
          !String(value)
            .toLowerCase()
            .includes(String(filter.contains).toLowerCase())
        ) {
          return false;
        }
        continue;
      }
      return false;
    }
    if (value !== condition) {
      return false;
    }
  }
  return true;
}

function applyOrderBy(rows: FakeInspectionRow[], orderBy: Record<string, unknown>[]) {
  return [...rows].sort((left, right) => {
    for (const clause of orderBy) {
      for (const [field, rawDirection] of Object.entries(clause)) {
        const direction =
          typeof rawDirection === "string"
            ? rawDirection
            : ((rawDirection as { sort?: "asc" | "desc" }).sort ?? "asc");
        const nullsLast =
          typeof rawDirection === "object" &&
          (rawDirection as { nulls?: string }).nulls === "last";
        const leftValue = left[field as keyof FakeInspectionRow];
        const rightValue = right[field as keyof FakeInspectionRow];
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

describe("inspection waitlist API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "inspection-e2e-salt");
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

  it("세션 없이는 검사 목록을 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/inspections")
      .set("Origin", allowedOrigin)
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_REQUIRED"));
  });

  it("검사 읽기 권한이 없는 역할은 403으로 거부된다", async () => {
    const materialManager = await loginAs("MATERIAL_MANAGER");
    await materialManager
      .get("/api/inspections")
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("기본 목록은 등록 순서로 전체를 반환하고 미판정은 null이다", async () => {
    const agent = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/inspections")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(DEMO_INSPECTIONS.length);
    const first = response.body.items[0];
    expect(first.inspectionNumber).toBe("INSP-2026-0101");
    expect(first).toMatchObject({
      executionStatus: "PENDING",
      verdict: null,
      gate: "LOT_COMPLETE",
    });
  });

  it("executionStatus 필터는 검사 대기만 구분한다", async () => {
    const agent = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/inspections")
      .query({ executionStatus: "PENDING" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(
      (response.body.items as { inspectionNumber: string }[]).map(
        (item) => item.inspectionNumber,
      ),
    ).toEqual(["INSP-2026-0101", "INSP-2026-0106", "INSP-2026-0110"]);
  });

  it("verdict 필터는 판정된 검사만 반환한다", async () => {
    const agent = await loginAs("QUALITY_ENGINEER");
    const pass = await agent
      .get("/api/inspections")
      .query({ verdict: "PASS" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(pass.body.total).toBe(3);

    const fail = await agent
      .get("/api/inspections")
      .query({ verdict: "FAIL,HOLD" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(
      (fail.body.items as { inspectionNumber: string }[]).map(
        (item) => item.inspectionNumber,
      ),
    ).toEqual(["INSP-2026-0104", "INSP-2026-0107"]);
  });

  it("gate 필터는 LOT 완료 게이트만 구분한다", async () => {
    const agent = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/inspections")
      .query({ gate: "LOT_COMPLETE" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(3);
    for (const item of response.body.items) {
      expect(item.gate).toBe("LOT_COMPLETE");
    }
  });

  it("q 검색은 검사 번호·생산 LOT·규격명을 포괄한다", async () => {
    const agent = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/inspections")
      .query({ q: "침담" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].specName).toContain("침담");
  });

  it("허용되지 않은 조회 조건은 400으로 거부한다", async () => {
    const agent = await loginAs("QUALITY_ENGINEER");
    await agent
      .get("/api/inspections")
      .query({ verdict: "MAYBE" })
      .set("Origin", allowedOrigin)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_INSPECTION_QUERY"));
  });
});
