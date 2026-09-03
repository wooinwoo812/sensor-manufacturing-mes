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
import { DEMO_PROCESS_STEPS } from "../prisma/demo-process-steps.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

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
  readonly auditEvents: { id: string; action: string; entityId: string }[] = [];
  readonly inspections = DEMO_INSPECTIONS.map((inspection, index) => ({
    ...inspection,
    gate: inspection.gate,
    executionStatus: inspection.executionStatus,
    verdict: inspection.verdict,
    verdictMemo: null,
    completedAt: inspection.completedAt,
    id: `inspection-${index + 1}`,
    workOrderId: `work-order-${DEMO_WORK_ORDERS.findIndex(
      (o) => o.orderNumber === inspection.workOrderNumber,
    ) + 1}`,
    createdAt: new Date(),
  }));
  readonly workOrders = DEMO_WORK_ORDERS.map((order, index) => ({
    ...order,
    status: order.status,
    id: `work-order-${index + 1}`,
    memo: null,
    progressPercent: order.progressPercent,
    currentStepName: order.currentStepName,
    createdAt: new Date(),
  }));
  readonly processSteps = DEMO_PROCESS_STEPS.map((step, index) => ({
    id: `step-${index + 1}`,
    workOrderId: `work-order-${DEMO_WORK_ORDERS.findIndex(
      (o) => o.orderNumber === step.workOrderNumber,
    ) + 1}`,
    sequence: step.sequence,
    processStepName: step.processStepName,
    productionLotNumber: step.productionLotNumber,
    readiness: step.readiness,
    blockedReasonCodes: [...step.blockedReasonCodes],
    startedAt: null,
    completedAt: null,
    goodQuantity: null,
    defectQuantity: null,
    executionMemo: null,
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

  inspectionIdOf(inspectionNumber: string): string {
    const index = DEMO_INSPECTIONS.findIndex(
      (inspection) => inspection.inspectionNumber === inspectionNumber,
    );
    return `inspection-${index + 1}`;
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
    create: async ({ data }: { data: { action: string; entityId: string } }) => {
      const row = { id: `audit-${++this.sequence}`, ...data };
      this.auditEvents.push(row);
      return row;
    },
    findMany: async () => this.auditEvents,
  };

  readonly inspection = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.inspections.find((inspection) => inspection.id === where.id) ?? null,
    findMany: async ({
      where,
    }: {
      where?: {
        workOrderId?: string;
        gate?: string;
        processStepName?: string;
        executionStatus?: { not?: string };
      };
    }) =>
      this.inspections.filter(
        (inspection) =>
          (where?.workOrderId === undefined ||
            inspection.workOrderId === where.workOrderId) &&
          (where?.gate === undefined || inspection.gate === where.gate) &&
          (where?.processStepName === undefined ||
            inspection.processStepName === where.processStepName) &&
          (where?.executionStatus?.not === undefined ||
            inspection.executionStatus !== where.executionStatus.not),
      ),
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = this.inspections.find((inspection) => inspection.id === where.id);
      if (row === undefined) {
        throw new Error("검사가 없습니다.");
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly workOrder = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.workOrders.find((order) => order.id === where.id) ?? null,
    findMany: async () => this.workOrders,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = this.workOrders.find((order) => order.id === where.id);
      if (row === undefined) {
        throw new Error("작업지시가 없습니다.");
      }
      Object.assign(row, data);
      return row;
    },
    create: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
    count: async () => this.workOrders.length,
  };

  readonly processStepExecution = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.processSteps.find((step) => step.id === where.id) ?? null,
    findMany: async ({
      where,
      orderBy,
    }: {
      where?: { workOrderId?: string; readiness?: string };
      orderBy?: Record<string, string>[];
    }) => {
      let rows = this.processSteps.filter(
        (step) =>
          (where?.workOrderId === undefined || step.workOrderId === where.workOrderId) &&
          (where?.readiness === undefined || step.readiness === where.readiness),
      );
      if (orderBy?.[0]?.sequence === "asc") {
        rows = [...rows].sort((left, right) => left.sequence - right.sequence);
      }
      return rows;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = this.processSteps.find((step) => step.id === where.id);
      if (row === undefined) {
        throw new Error("공정이 없습니다.");
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly materialAllocation = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
    update: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
  };

  readonly materialLot = {
    findUnique: async () => null,
    findMany: async () => [],
    update: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
    count: async () => 0,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("inspection verdict command", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "verdict-e2e-salt");
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

  it("세션 없이는 판정을 실행할 수 없다", async () => {
    await request(app.getHttpServer())
      .post("/api/inspections/x/verdict")
      .set("Origin", allowedOrigin)
      .send({ verdict: "PASS" })
      .expect(401);
  });

  it("대기 검사에 판정을 기록하고 감사를 남긴다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");
    const inspectionId = prisma.inspectionIdOf("INSP-2026-0101");

    await agent
      .post(`/api/inspections/${inspectionId}/verdict`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ verdict: "PASS", memo: "전 항목 기준 내" })
      .expect(200);

    const inspection = prisma.inspections.find(
      (row) => row.id === inspectionId,
    );
    expect(inspection).toMatchObject({
      executionStatus: "COMPLETED",
      verdict: "PASS",
      verdictMemo: "전 항목 기준 내",
    });
    expect(inspection?.completedAt).not.toBeNull();
    expect(
      prisma.auditEvents.some(
        (event) =>
          event.action === "INSPECTION_VERDICTED" &&
          event.entityId === "INSP-2026-0101",
      ),
    ).toBe(true);
  });

  it("이미 판정된 검사와 잘못된 값을 계약 code로 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");

    const completedId = prisma.inspectionIdOf("INSP-2026-0103");
    await agent
      .post(`/api/inspections/${completedId}/verdict`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ verdict: "PASS" })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("INSPECTION_ALREADY_VERDICTED"));

    const pendingId = prisma.inspectionIdOf("INSP-2026-0106");
    await agent
      .post(`/api/inspections/${pendingId}/verdict`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ verdict: "MAYBE" })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_INSPECTION_VERDICT_INPUT"));
  });

  it("판정 권한이 없는 역할은 403으로 거부된다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    const pendingId = prisma.inspectionIdOf("INSP-2026-0106");
    await agent
      .post(`/api/inspections/${pendingId}/verdict`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ verdict: "PASS" })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("CSRF token 없이는 판정을 거부한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const pendingId = prisma.inspectionIdOf("INSP-2026-0106");
    await agent
      .post(`/api/inspections/${pendingId}/verdict`)
      .set("Origin", allowedOrigin)
      .send({ verdict: "PASS" })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));
  });

  it("미판정 ROUTE_ADVANCE 검사는 다음 공정 승격을 차단한다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    const stepId = prisma.processSteps.find(
      (step) =>
        step.workOrderId === "work-order-7" && step.processStepName === "절단 1공정",
    )?.id;
    expect(stepId).toBeDefined();
    prisma.inspections.push({
      inspectionNumber: "INSP-2026-0900",
      workOrderNumber: "WO-2026-097",
      productionLotNumber: "PL-2026-097A",
      processStepName: "절단 1공정",
      gate: "ROUTE_ADVANCE",
      specName: "절단 치수 검사 규격 v2",
      executionStatus: "PENDING",
      verdict: null,
      verdictMemo: null,
      completedAt: null,
      id: "inspection-crafted",
      workOrderId: "work-order-7",
      createdAt: new Date(),
    });

    await agent
      .post(`/api/process-executions/steps/${stepId}/start`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(200);
    await agent
      .post(`/api/process-executions/steps/${stepId}/complete`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ goodQuantity: 100, defectQuantity: 0 })
      .expect(200);

    const following = prisma.processSteps.find(
      (step) =>
        step.workOrderId === "work-order-7" && step.processStepName === "조립 1공정",
    );
    expect(following?.readiness).toBe("BLOCKED");
    expect(following?.blockedReasonCodes).toContain("INSPECTION_PENDING");
  });
});
