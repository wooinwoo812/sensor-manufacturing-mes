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
import { DEMO_PROCESS_STEPS } from "../prisma/demo-process-steps.js";
import { DEMO_WORK_ORDERS } from "../prisma/demo-work-orders.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

interface FakeStepRow {
  id: string;
  workOrderId: string;
  sequence: number;
  processStepName: string;
  productionLotNumber: string;
  readiness: string;
  blockedReasonCodes: string[];
  workOrder: {
    orderNumber: string;
    productCode: string;
    productName: string;
    plannedQuantity: number;
    unit: string;
    dueDate: Date;
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
  readonly processSteps: FakeStepRow[] = DEMO_PROCESS_STEPS.map((step, index) => {
    const order = DEMO_WORK_ORDERS.find(
      (candidate) => candidate.orderNumber === step.workOrderNumber,
    );
    if (order === undefined) {
      throw new Error(`테스트 작업지시 없음: ${step.workOrderNumber}`);
    }
    return {
      ...step,
      readiness: step.readiness,
      id: `process-step-${index + 1}`,
      workOrderId: `work-order-${step.workOrderNumber}`,
      workOrder: {
        orderNumber: order.orderNumber,
        productCode: order.productCode,
        productName: order.productName,
        plannedQuantity: order.plannedQuantity,
        unit: order.unit,
        dueDate: order.dueDate,
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

  readonly processStepExecution = {
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
        this.processSteps.filter((row) => matchesWhere(row, where)),
        orderBy,
      ).slice(skip, skip + take).map((row) => ({ ...row, workOrder: { ...row.workOrder, processSteps: this.processSteps.filter((step) => step.workOrderId === row.workOrderId).map((step) => ({ ...step, goodQuantity: null })) } })),
    count: async ({ where = {} }: { where?: Record<string, unknown> }) =>
      this.processSteps.filter((row) => matchesWhere(row, where)).length,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

function fieldMatches(row: FakeStepRow, condition: unknown, field: string): boolean {
  if (field === "workOrder") {
    const clauses = condition as {
      OR?: { orderNumber?: { contains: string }; productName?: { contains: string } }[];
    };
    return (
      clauses.OR?.some((clause) =>
        Object.entries(clause).some(([key, filter]) =>
          String(row.workOrder[key as "orderNumber" | "productName"])
            .toLowerCase()
            .includes(filter.contains.toLowerCase()),
        ),
      ) ?? true
    );
  }

  const value = row[field as keyof FakeStepRow];
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
    return false;
  }
  return value === condition;
}

function matchesWhere(row: FakeStepRow, where: Record<string, unknown>) {
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
    if (!fieldMatches(row, condition, field)) {
      return false;
    }
  }
  return true;
}

function applyOrderBy(rows: FakeStepRow[], orderBy: Record<string, unknown>[]) {
  return [...rows].sort((left, right) => {
    for (const clause of orderBy) {
      for (const [field, rawDirection] of Object.entries(clause)) {
        const direction =
          typeof rawDirection === "string"
            ? rawDirection
            : (((rawDirection as { orderNumber?: string }).orderNumber ??
                (rawDirection as { sort?: "asc" | "desc" }).sort) as "asc" | "desc");
        const leftValue =
          field === "workOrder"
            ? left.workOrder.orderNumber
            : left[field as keyof FakeStepRow];
        const rightValue =
          field === "workOrder"
            ? right.workOrder.orderNumber
            : right[field as keyof FakeStepRow];
        let comparison: number;
        if (typeof leftValue === "number" && typeof rightValue === "number") {
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

describe("process execution queue API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "process-e2e-salt");
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

  it("세션 없이는 실행 대기열을 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/process-executions")
      .set("Origin", allowedOrigin)
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_REQUIRED"));
  });

  it("공정 읽기 권한이 없는 역할은 403으로 거부된다", async () => {
    const materialManager = await loginAs("MATERIAL_MANAGER");
    await materialManager
      .get("/api/process-executions")
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("기본 대기열은 작업지시와 공정 순서로 전체를 반환한다", async () => {
    const agent = await loginAs("SHOP_FLOOR_OPERATOR");
    const response = await agent
      .get("/api/process-executions")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(DEMO_PROCESS_STEPS.length);
    expect(response.body.items[0]).toMatchObject({
      workOrderNumber: "WO-2026-091",
      sequence: 30,
      processStepName: "조립 2공정",
      productionLotNumber: "PL-2026-091A",
      readiness: "IN_PROGRESS",
    });
  });

  it("readiness 필터는 실행 가능·진행 중·차단·완료를 구분한다", async () => {
    const agent = await loginAs("SHOP_FLOOR_OPERATOR");

    const ready = await agent
      .get("/api/process-executions")
      .query({ readiness: "ready" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(ready.body.total).toBe(1);
    for (const item of ready.body.items) {
      expect(item.readiness).toBe("READY");
    }

    const blocked = await agent
      .get("/api/process-executions")
      .query({ readiness: "blocked" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(blocked.body.total).toBe(3);
    const blockedReasons = (blocked.body.items as { blockedReasonCodes: string[] }[])
      .flatMap((item) => item.blockedReasonCodes)
      .sort();
    expect(blockedReasons).toEqual(["INSPECTION_FAILED", "INSPECTION_HELD", "MATERIAL_SHORTAGE"]);

    const completed = await agent
      .get("/api/process-executions")
      .query({ readiness: "completed" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(completed.body.total).toBe(2);
  });

  it("q 검색은 작업지시 번호·공정명·생산 LOT를 포괄한다", async () => {
    const agent = await loginAs("SHOP_FLOOR_OPERATOR");
    const response = await agent
      .get("/api/process-executions")
      .query({ q: "침담" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].processStepName).toBe("침담 공정");
  });

  it("허용되지 않은 조회 조건은 400으로 거부한다", async () => {
    const agent = await loginAs("SHOP_FLOOR_OPERATOR");
    await agent
      .get("/api/process-executions")
      .query({ readiness: "paused" })
      .set("Origin", allowedOrigin)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_PROCESS_EXECUTION_QUERY"));
  });
});
