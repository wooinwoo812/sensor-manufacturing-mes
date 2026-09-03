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
import { DEMO_WORK_ORDERS } from "../prisma/demo-work-orders.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

interface FakeWorkOrderRow {
  id: string;
  orderNumber: string;
  productCode: string;
  productName: string;
  plannedQuantity: number;
  unit: string;
  dueDate: Date;
  status: string;
  priority: string;
  progressPercent: number;
  currentStepName: string | null;
  blockedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type WhereClause = Record<string, unknown>;

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
  readonly workOrders: FakeWorkOrderRow[] = DEMO_WORK_ORDERS.map((order, index) => ({
    ...order,
    status: order.status,
    priority: order.priority,
    id: `work-order-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

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
      const session = {
        ...data,
        id: `session-${++this.sequence}`,
        revokedAt: null,
      };
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

  readonly workOrder = {
    findMany: async ({
      where = {},
      orderBy = [],
      skip = 0,
      take = Number.POSITIVE_INFINITY,
    }: {
      where?: WhereClause;
      orderBy?: { [key: string]: "asc" | "desc" }[];
      skip?: number;
      take?: number;
    }) =>
      applyOrderBy(
        this.workOrders.filter((row) => matchesWhere(row, where)),
        orderBy,
      ).slice(skip, skip + take),
    count: async ({ where = {} }: { where?: WhereClause }) =>
      this.workOrders.filter((row) => matchesWhere(row, where)).length,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

function fieldMatches(row: FakeWorkOrderRow, condition: unknown, field: string) {
  const value = row[field as keyof FakeWorkOrderRow];
  if (condition === null) {
    return value === null;
  }
  if (typeof condition === "object" && condition !== null) {
    const filter = condition as Record<string, unknown>;
    if ("in" in filter) {
      return (filter.in as unknown[]).includes(value);
    }
    if ("notIn" in filter) {
      return !(filter.notIn as unknown[]).includes(value);
    }
    if ("not" in filter) {
      return value !== filter.not;
    }
    if ("contains" in filter) {
      return String(value)
        .toLowerCase()
        .includes(String(filter.contains).toLowerCase());
    }
    if ("lt" in filter) {
      return value instanceof Date && value < new Date(filter.lt as string);
    }
    if ("gte" in filter) {
      return value instanceof Date && value >= new Date(filter.gte as string);
    }
    return false;
  }
  return value === condition;
}

function matchesWhere(row: FakeWorkOrderRow, where: WhereClause) {
  for (const [field, condition] of Object.entries(where)) {
    if (field === "OR") {
      const anyMatch = (condition as WhereClause[]).some((alternative) =>
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

function applyOrderBy(
  rows: FakeWorkOrderRow[],
  orderBy: { [key: string]: "asc" | "desc" }[],
) {
  return [...rows].sort((left, right) => {
    for (const clause of orderBy) {
      for (const [field, direction] of Object.entries(clause)) {
        const leftValue = left[field as keyof FakeWorkOrderRow];
        const rightValue = right[field as keyof FakeWorkOrderRow];
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

describe("work order list API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "work-order-e2e-salt");
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

  async function loginAsPlanner() {
    const account = DEMO_ACCOUNTS.find(
      (candidate) => candidate.role === "PRODUCTION_PLANNER",
    );
    expect(account).toBeDefined();
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account?.email, password: DEMO_PASSWORD })
      .expect(200);
    return agent;
  }

  it("세션 없이는 작업지시를 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/work-orders")
      .set("Origin", allowedOrigin)
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_REQUIRED"));
  });

  it("기본 목록은 납기 임박 순서로 전체를 반환한다", async () => {
    const agent = await loginAsPlanner();
    const response = await agent
      .get("/api/work-orders")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(DEMO_WORK_ORDERS.length);
    expect(response.body.page).toBe(1);
    const dueDates = (response.body.items as { dueDate: string }[]).map(
      (item) => new Date(item.dueDate).getTime(),
    );
    const sorted = [...dueDates].sort((left, right) => left - right);
    expect(dueDates).toEqual(sorted);
    expect(response.body.items[0]).toMatchObject({
      orderNumber: "WO-2026-095",
      productCode: "SEN-XR-1280",
    });
  });

  it("status 필터는 enum array를 지원한다", async () => {
    const agent = await loginAsPlanner();
    const response = await agent
      .get("/api/work-orders")
      .query({ status: "IN_PROGRESS" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(3);
    for (const item of response.body.items) {
      expect(item.status).toBe("IN_PROGRESS");
    }
  });

  it("priority 필터와 due 필터를 조합한다", async () => {
    const agent = await loginAsPlanner();
    const overdue = await agent
      .get("/api/work-orders")
      .query({ due: "overdue" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(overdue.body.total).toBe(1);
    expect(
      (overdue.body.items as { orderNumber: string }[]).map((item) => item.orderNumber).sort(),
    ).toEqual(["WO-2026-092"]);

    const urgent = await agent
      .get("/api/work-orders")
      .query({ priority: "URGENT" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(urgent.body.total).toBe(2);
  });

  it("blocked 필터는 차단 사유가 있는 작업지만 반환한다", async () => {
    const agent = await loginAsPlanner();
    const response = await agent
      .get("/api/work-orders")
      .query({ blocked: "true" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(
      (response.body.items as { orderNumber: string }[]).map((item) => item.orderNumber).sort(),
    ).toEqual(["WO-2026-092", "WO-2026-098"]);
  });

  it("q 검색은 작업지시 번호·제품 코드·제품명을 포괄한다", async () => {
    const agent = await loginAsPlanner();
    const response = await agent
      .get("/api/work-orders")
      .query({ q: "x선" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(3);
    for (const item of response.body.items) {
      expect(item.productName).toContain("X선");
    }
  });

  it("pageSize와 page로 범위를 제한한다", async () => {
    const agent = await loginAsPlanner();
    const response = await agent
      .get("/api/work-orders")
      .query({ pageSize: 3, page: 2 })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.items).toHaveLength(3);
    expect(response.body.total).toBe(DEMO_WORK_ORDERS.length);
  });

  it("허용되지 않은 조회 조건은 400으로 거부한다", async () => {
    const agent = await loginAsPlanner();
    await agent
      .get("/api/work-orders")
      .query({ status: "PAUSED" })
      .set("Origin", allowedOrigin)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_WORK_ORDER_QUERY"));
    await agent
      .get("/api/work-orders")
      .query({ pageSize: "500" })
      .set("Origin", allowedOrigin)
      .expect(400);
  });

  it("모든 데모 역할이 작업지시 읽기 권한으로 목록에 접근한다", async () => {
    for (const account of DEMO_ACCOUNTS) {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: account.email, password: DEMO_PASSWORD })
        .expect(200);
      await agent
        .get("/api/work-orders")
        .set("Origin", allowedOrigin)
        .expect(200);
    }
  });
});
