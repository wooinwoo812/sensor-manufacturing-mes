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
  readonly users = DEMO_ACCOUNTS.map((account) => ({
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    passwordHash,
    isActive: true,
    isDemo: true,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    roles: [
      {
        roleCode: account.role,
        role: { code: account.role, label: account.role },
      },
    ],
  }));
  readonly sessions: FakeSessionRow[] = [];

  readonly workOrders = DEMO_WORK_ORDERS.map((order, index) => ({
    ...order,
    id: `work-order-${index + 1}`,
    createdAt: new Date("2026-09-01T00:00:00Z"),
  }));

  readonly processSteps = DEMO_PROCESS_STEPS.map((step, index) => ({
    id: `step-${index + 1}`,
    workOrderId: `work-order-${
      DEMO_WORK_ORDERS.findIndex(
        (o) => o.orderNumber === step.workOrderNumber,
      ) + 1
    }`,
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

  readonly inspections = [
    {
      id: "inspection-1",
      inspectionNumber: "INSP-2026-0901",
      workOrderId: "work-order-1",
      processStepName: "조립 2공정",
      gate: "ROUTE_ADVANCE",
      executionStatus: "PENDING",
      verdict: null,
    },
  ];

  readonly qualityIncidents = [
    {
      id: "incident-1",
      incidentNumber: "QI-2026-0901",
      title: "TE 쿨링 모듈 온도 편차 발견",
      sourceType: "MATERIAL_LOT",
      sourceLotNumber: "ML-2026-0323",
      description: "입고 검사에서 온도 편차 확인",
      status: "OPEN",
      detectedAt: new Date("2026-09-01T02:00:00Z"),
      resolvedAt: null,
      createdAt: new Date("2026-09-01T02:05:00Z"),
    },
  ];

  readonly auditEvents = [
    {
      id: "audit-1",
      action: "QUALITY_INCIDENT_REGISTERED",
      actorName: "품질 담당자",
      summary: "부적합 사건 등록",
      entityType: "QUALITY_INCIDENT",
      entityId: "QI-2026-0901",
      occurredAt: new Date("2026-09-01T02:05:00Z"),
    },
  ];

  constructor() {
    void passwordHash;
  }

  readonly user = {
    findUnique: async ({ where }: { where: { email: string } }) =>
      this.users.find((user) => user.email === where.email) ?? null,
    findMany: async () => this.users,
  };

  readonly session = {
    create: async ({
      data,
    }: {
      data: Omit<FakeSessionRow, "id" | "revokedAt">;
    }) => {
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
      const user = this.users.find(
        (candidate) => candidate.id === session.userId,
      );
      if (user === undefined) {
        return null;
      }
      return { ...session, userRole: { user } };
    },
    updateMany: async () => ({ count: 0 }),
  };

  readonly processStepExecution = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const step = this.processSteps.find((row) => row.id === where.id);
      if (step === undefined) {
        return null;
      }
      const workOrder = this.workOrders.find(
        (order) => order.id === step.workOrderId,
      );
      return { ...step, workOrder: { ...workOrder, processSteps: this.processSteps.filter((row) => row.workOrderId === step.workOrderId) } };
    },
  };

  readonly inspection = {
    findMany: async ({
      where,
    }: {
      where?: {
        workOrderId?: string;
        processStepName?: string;
        executionStatus?: { not: string };
      };
    }) =>
      this.inspections.filter(
        (row) =>
          (where?.workOrderId === undefined ||
            row.workOrderId === where.workOrderId) &&
          (where?.processStepName === undefined ||
            row.processStepName === where.processStepName) &&
          (where?.executionStatus === undefined ||
            row.executionStatus !== where.executionStatus.not),
      ),
  };

  readonly qualityIncident = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.qualityIncidents.find((row) => row.id === where.id) ?? null,
  };

  readonly auditEvent = {
    findMany: async ({
      where,
    }: {
      where?: { entityType?: string; entityId?: string };
    }) =>
      this.auditEvents.filter(
        (row) =>
          (where?.entityType === undefined ||
            row.entityType === where.entityType) &&
          (where?.entityId === undefined || row.entityId === where.entityId),
      ),
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("detail route APIs", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "detail-routes-salt");
    prisma = new FakePrismaService();
    (prisma.users as { passwordHash: string }[]).forEach((user) => {
      user.passwordHash = passwordHash;
    });
  });

  beforeEach(async () => {
    process.env.WEB_ORIGIN = allowedOrigin;
    process.env.NODE_ENV = "test";

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
    const account = DEMO_ACCOUNTS.find(
      (candidate) => candidate.role === roleCode,
    );
    expect(account).toBeDefined();
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account?.email, password: DEMO_PASSWORD })
      .expect(200);
    return { agent, csrfToken: login.body.csrfToken as string };
  }

  describe("quality incident detail", () => {
    it("사건 상세와 감사 이력을 반환한다", async () => {
      const { agent } = await loginAs("QUALITY_ENGINEER");
      const response = await agent
        .get("/api/quality-incidents/incident-1")
        .set("Origin", allowedOrigin)
        .expect(200);

      expect(response.body).toMatchObject({
        incidentNumber: "QI-2026-0901",
        status: "OPEN",
        sourceLotNumber: "ML-2026-0323",
      });
      expect(response.body.audits).toHaveLength(1);
      expect(response.body.audits[0]).toMatchObject({
        action: "QUALITY_INCIDENT_REGISTERED",
      });
    });

    it("존재하지 않는 사건은 404를 받는다", async () => {
      const { agent } = await loginAs("QUALITY_ENGINEER");
      await agent
        .get("/api/quality-incidents/incident-none")
        .set("Origin", allowedOrigin)
        .expect(404);
    });
  });

  describe("process execution step detail", () => {
    it("공정 상세와 적용 검사를 반환한다", async () => {
      const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");
      const response = await agent
        .get("/api/process-executions/steps/step-1")
        .set("Origin", allowedOrigin)
        .expect(200);

      expect(response.body).toMatchObject({
        id: "step-1",
        workOrderNumber: "WO-2026-091",
        processStepName: "조립 2공정",
      });
      expect(response.body.inspections).toHaveLength(1);
      expect(response.body.inspections[0]).toMatchObject({
        inspectionNumber: "INSP-2026-0901",
        gate: "ROUTE_ADVANCE",
      });
    });

    it("존재하지 않는 공정은 404를 받는다", async () => {
      const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");
      await agent
        .get("/api/process-executions/steps/step-none")
        .set("Origin", allowedOrigin)
        .expect(404);
    });
  });

  describe("admin users list", () => {
    it("사용자 관리 권한이 있으면 사용자 목록을 반환한다", async () => {
      const { agent } = await loginAs("SYSTEM_ADMIN");
      const response = await agent
        .get("/api/admin/users")
        .set("Origin", allowedOrigin)
        .expect(200);

      expect(response.body).toHaveLength(DEMO_ACCOUNTS.length);
      expect(response.body[0]).toMatchObject({
        email: expect.any(String),
        isActive: true,
      });
    });

    it("권한이 없는 역할은 403을 받는다", async () => {
      const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");
      await agent
        .get("/api/admin/users")
        .set("Origin", allowedOrigin)
        .expect(403);
    });
  });
});
