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
import { DEMO_PROCESS_STEPS } from "../prisma/demo-process-steps.js";
import { DEMO_INSPECTIONS } from "../prisma/demo-inspections.js";

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
  memo: string | null;
  createdAt: Date;
  processSteps: { readiness: string }[];
  inspections: {
    inspectionNumber: string;
    processStepName: string;
    gate: string;
    specName: string;
    executionStatus: string;
    verdict: string | null;
  }[];
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
  readonly auditEvents: {
    id: string;
    action: string;
    entityId: string;
    actorRole: string;
    summary: string;
    occurredAt: Date;
    [key: string]: unknown;
  }[] = [];
  readonly workOrders: FakeWorkOrderRow[] = DEMO_WORK_ORDERS.map((order, index) => ({
    ...order,
    status: order.status,
    priority: order.priority,
    id: `work-order-${index + 1}`,
    memo: null,
    createdAt: new Date(Date.now() - (index + 1) * 3_600_000),
    processSteps: DEMO_PROCESS_STEPS.filter(
      (step) => step.workOrderNumber === order.orderNumber,
    ).map((step) => ({ readiness: step.readiness })),
    inspections: DEMO_INSPECTIONS.filter(
      (inspection) => inspection.workOrderNumber === order.orderNumber,
    ).map((inspection) => ({
      inspectionNumber: inspection.inspectionNumber,
      processStepName: inspection.processStepName,
      gate: inspection.gate,
      specName: inspection.specName,
      executionStatus: inspection.executionStatus,
      verdict: inspection.verdict,
    })),
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

  readonly auditEvent = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `audit-${++this.sequence}`, ...data };
      this.auditEvents.push(row as (typeof this.auditEvents)[number]);
      return row;
    },
    findMany: async ({ where }: { where: Record<string, unknown> }) =>
      this.auditEvents.filter(
        (event) =>
          where.entityId === undefined || event.entityId === where.entityId,
      ),
  };

  readonly workOrder = {
    findUnique: async ({ where }: { where: { id?: string; orderNumber?: string } }) =>
      this.workOrders.find(
        (order) =>
          (where.id !== undefined && order.id === where.id) ||
          (where.orderNumber !== undefined &&
            order.orderNumber === where.orderNumber),
      ) ?? null,
    findMany: async () => this.workOrders.map((order) => ({ ...order })),
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row: FakeWorkOrderRow = {
        id: `work-order-created-${++this.sequence}`,
        orderNumber: String(data.orderNumber),
        productCode: String(data.productCode),
        productName: String(data.productName),
        plannedQuantity: Number(data.plannedQuantity),
        unit: String(data.unit),
        dueDate: data.dueDate as Date,
        status: String(data.status ?? "DRAFT"),
        priority: String(data.priority ?? "NORMAL"),
        progressPercent: 0,
        currentStepName: null,
        blockedReason: null,
        memo: (data.memo as string | undefined) ?? null,
        createdAt: new Date(),
        processSteps: [],
        inspections: [],
      };
      this.workOrders.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = this.workOrders.find((order) => order.id === where.id);
      if (row === undefined) {
        throw new Error("대상 작업지시가 없습니다.");
      }
      Object.assign(row, data);
      return row;
    },
    count: async () => this.workOrders.length,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

function futureDate(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function pastDate(days: number): string {
  return futureDate(-days);
}

describe("work order commands", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "command-e2e-salt");
  });

  beforeEach(async () => {
    process.env.WEB_ORIGIN = allowedOrigin;
    process.env.NODE_ENV = "test";

    prisma = new FakePrismaService();
    const testingModule = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account?.email, password: DEMO_PASSWORD })
      .expect(200);
    return { agent, csrfToken: login.body.csrfToken as string };
  }

  async function findByOrderNumber(
    agent: ReturnType<typeof request.agent>,
    orderNumber: string,
  ) {
    const response = await agent
      .get("/api/work-orders")
      .query({ q: orderNumber })
      .set("Origin", allowedOrigin)
      .expect(200);
    return (
      (response.body.items as { id: string; orderNumber: string }[]).find(
        (item) => item.orderNumber === orderNumber,
      ) ?? undefined
    );
  }

  it("생성 제품 목록을 반환한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");
    const response = await agent
      .get("/api/work-orders/products")
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0]).toMatchObject({ code: "SEN-IR-640" });
  });

  it("생성 권한과 CSRF 검증을 통과하면 초안을 생성하고 감사를 남긴다", async () => {
    const { agent, csrfToken } = await loginAs("PRODUCTION_PLANNER");
    const response = await agent
      .post("/api/work-orders")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({
        productCode: "SEN-IR-640",
        plannedQuantity: 60,
        dueDate: futureDate(7),
        priority: "HIGH",
        memo: "검증용 초안",
      })
      .expect(201);

    expect(response.body.status).toBe("DRAFT");
    expect(response.body.orderNumber).toMatch(/^WO-\d{4}-\d{3}$/);
    expect(response.body.memo).toBe("검증용 초안");
    expect(response.body.recentAudits).toHaveLength(1);
    expect(response.body.recentAudits[0]).toMatchObject({
      action: "WORK_ORDER_CREATED",
      actorRole: "PRODUCTION_PLANNER",
    });
  });

  it("생성 입력값이 올바르지 않으면 400으로 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("PRODUCTION_PLANNER");
    const base = {
      productCode: "SEN-IR-640",
      plannedQuantity: 10,
      dueDate: futureDate(5),
      priority: "NORMAL",
    };
    await agent
      .post("/api/work-orders")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ ...base, productCode: "UNKNOWN-1" })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_WORK_ORDER_INPUT"));
    await agent
      .post("/api/work-orders")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ ...base, plannedQuantity: 0 })
      .expect(400);
    await agent
      .post("/api/work-orders")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ ...base, dueDate: pastDate(1) })
      .expect(400);
  });

  it("CSRF token 없이는 command를 거부한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");
    await agent
      .post("/api/work-orders")
      .set("Origin", allowedOrigin)
      .send({
        productCode: "SEN-IR-640",
        plannedQuantity: 10,
        dueDate: futureDate(5),
        priority: "NORMAL",
      })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));
  });

  it("생성 권한이 없는 역할은 403으로 거부된다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    await agent
      .post("/api/work-orders")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({
        productCode: "SEN-IR-640",
        plannedQuantity: 10,
        dueDate: futureDate(5),
        priority: "NORMAL",
      })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("릴리스는 초안을 발행 상태로 전환하고 감사를 남긴다", async () => {
    const { agent, csrfToken } = await loginAs("PRODUCTION_PLANNER");
    const created = await agent
      .post("/api/work-orders")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({
        productCode: "SEN-XR-1280",
        plannedQuantity: 20,
        dueDate: futureDate(3),
        priority: "URGENT",
      })
      .expect(201);

    const released = await agent
      .post(`/api/work-orders/${created.body.id}/release`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(200);
    expect(released.body.status).toBe("RELEASED");
    expect(
      released.body.recentAudits.map((event: { action: string }) => event.action),
    ).toContain("WORK_ORDER_RELEASED");

    await agent
      .post(`/api/work-orders/${created.body.id}/release`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("WORK_ORDER_NOT_DRAFT"));
  });

  it("취소는 사유를 요구하고 실행 실적이 있으면 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("PRODUCTION_PLANNER");

    const draftRow = await findByOrderNumber(agent, "WO-2026-093");
    expect(draftRow).toBeDefined();
    const cancelled = await agent
      .post(`/api/work-orders/${draftRow?.id}/cancel`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ reason: "계획 변경으로 취소 검증" })
      .expect(200);
    expect(cancelled.body.status).toBe("CANCELLED");

    const inProgress = await findByOrderNumber(agent, "WO-2026-091");
    await agent
      .post(`/api/work-orders/${inProgress?.id}/cancel`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ reason: "진행 중 지시 취소 시도" })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("WORK_ORDER_NOT_CANCELLABLE"));

    prisma.workOrders.push({
      id: "work-order-released-with-execution",
      orderNumber: "WO-2026-900",
      productCode: "SEN-IR-640",
      productName: "적외선 센서 모듈 640px",
      plannedQuantity: 10,
      unit: "EA",
      dueDate: new Date(Date.now() + 5 * 86_400_000),
      status: "RELEASED",
      priority: "NORMAL",
      progressPercent: 0,
      currentStepName: null,
      blockedReason: null,
      memo: null,
      createdAt: new Date(),
      processSteps: [{ readiness: "IN_PROGRESS" }],
      inspections: [],
    });
    await agent
      .post("/api/work-orders/work-order-released-with-execution/cancel")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ reason: "실적이 있는 지시 취소 시도" })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("WORK_ORDER_HAS_EXECUTION"));

    const draftRow2 = await findByOrderNumber(agent, "WO-2026-099");
    await agent
      .post(`/api/work-orders/${draftRow2?.id}/cancel`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ reason: "짧" })
      .expect(400);
  });

  it("상세는 공정·검사·감사를 포함하고 없는 ID는 404를 반환한다", async () => {
    const { agent } = await loginAs("MATERIAL_MANAGER");
    const target = await findByOrderNumber(agent, "WO-2026-091");
    const detail = await agent
      .get(`/api/work-orders/${target?.id}`)
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(detail.body.orderNumber).toBe("WO-2026-091");
    expect(detail.body.steps.length).toBeGreaterThan(0);
    expect(detail.body.inspections.length).toBeGreaterThan(0);
    expect(detail.body.memo).toBeNull();

    await agent
      .get("/api/work-orders/does-not-exist")
      .set("Origin", allowedOrigin)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe("WORK_ORDER_NOT_FOUND"));
  });
});
