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
import { DEMO_MATERIAL_LOTS } from "../prisma/demo-material-lots.js";
import { DEMO_INSPECTIONS } from "../prisma/demo-inspections.js";

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
  startedAt: Date | null;
  completedAt: Date | null;
  goodQuantity: number | null;
  defectQuantity: number | null;
  executionMemo: string | null;
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
  readonly auditEvents: { id: string; action: string; entityId: string }[] = [];
  readonly workOrders = DEMO_WORK_ORDERS.map((order, index) => ({
    ...order,
    status: order.status,
    id: `work-order-${index + 1}`,
    memo: null,
    progressPercent: order.progressPercent,
    currentStepName: order.currentStepName,
    createdAt: new Date(),
  }));
  readonly processSteps: FakeStepRow[] = DEMO_PROCESS_STEPS.map((step, index) => ({
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
  readonly materialLots = DEMO_MATERIAL_LOTS.map((lot, index) => ({
    ...lot,
    id: `lot-${index + 1}`,
    materialId: `material-${index + 1}`,
    onHand: lot.onHand,
    reservedQuantity: lot.reservedQuantity,
    consumedQuantity: lot.consumedQuantity,
  }));
  readonly materialAllocations: {
    id: string;
    workOrderId: string;
    materialLotId: string;
    quantity: number;
    status: string;
    closedReason: string | null;
    closedAt: Date | null;
  }[] = [];
  readonly inspections = DEMO_INSPECTIONS.map((inspection) => ({
    ...inspection,
    gate: inspection.gate,
    executionStatus: inspection.executionStatus,
    verdict: inspection.verdict,
    id: `inspection-${inspection.inspectionNumber}`,
    workOrderId: `work-order-${DEMO_WORK_ORDERS.findIndex(
      (o) => o.orderNumber === inspection.workOrderNumber,
    ) + 1}`,
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

  stepIdOf(orderNumber: string, stepName: string): string | undefined {
    const orderIndex = DEMO_WORK_ORDERS.findIndex(
      (o) => o.orderNumber === orderNumber,
    );
    const step = this.processSteps.find(
      (row) => row.workOrderId === `work-order-${orderIndex + 1}` && row.processStepName === stepName,
    );
    return step?.id;
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

  readonly workOrder = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.workOrders.find((order) => order.id === where.id) ?? null,
    findMany: async () => this.workOrders,
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
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

  readonly inspection = {
    findUnique: async () => null,
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
    update: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
  };

  readonly materialAllocation = {
    findMany: async ({
      where,
    }: {
      where?: { workOrderId?: string; status?: string };
    }) =>
      this.materialAllocations.filter(
        (row) =>
          (where?.workOrderId === undefined || row.workOrderId === where.workOrderId) &&
          (where?.status === undefined || row.status === where.status),
      ),
    findUnique: async () => null,
    create: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = this.materialAllocations.find((a) => a.id === where.id);
      if (row === undefined) {
        throw new Error("예약이 없습니다.");
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly materialLot = {
    findUnique: async () => null,
    findMany: async () => this.materialLots,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = this.materialLots.find((lot) => lot.id === where.id);
      if (row === undefined) {
        throw new Error("자재 LOT이 없습니다.");
      }
      const record = row as unknown as Record<string, number>;
      for (const [key, value] of Object.entries(data)) {
        if (
          typeof value === "object" &&
          value !== null &&
          "increment" in (value as Record<string, unknown>)
        ) {
          record[key] = (record[key] ?? 0) + (value as { increment: number }).increment;
        } else if (
          typeof value === "object" &&
          value !== null &&
          "decrement" in (value as Record<string, unknown>)
        ) {
          record[key] = (record[key] ?? 0) - (value as { decrement: number }).decrement;
        } else {
          Object.assign(row, { [key]: value });
        }
      }
      return row;
    },
    count: async () => this.materialLots.length,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("process execution commands", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "process-command-salt");
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

  it("실행 가능 공정을 시작하고 작업지시를 진행 상태로 전환한다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    const stepId = prisma.stepIdOf("WO-2026-097", "절단 1공정");
    expect(stepId).toBeDefined();

    await agent
      .post(`/api/process-executions/steps/${stepId}/start`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(200);

    const step = prisma.processSteps.find((row) => row.id === stepId);
    expect(step?.readiness).toBe("IN_PROGRESS");
    expect(step?.startedAt).not.toBeNull();
    const order = prisma.workOrders.find(
      (row) => row.orderNumber === "WO-2026-097",
    );
    expect(order?.status).toBe("IN_PROGRESS");
    expect(
      prisma.auditEvents.some(
        (event) => event.action === "PROCESS_STARTED" && event.entityId === "WO-2026-097",
      ),
    ).toBe(true);
  });

  it("시작 거부·권한·404를 계약 code로 반환한다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");

    const waitingId = prisma.stepIdOf("WO-2026-091", "최종 검사");
    await agent
      .post(`/api/process-executions/steps/${waitingId}/start`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("PROCESS_NOT_READY"));

    await agent
      .post("/api/process-executions/steps/unknown/start")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe("PROCESS_STEP_NOT_FOUND"));

    const quality = await loginAs("QUALITY_ENGINEER");
    await quality.agent
      .post(`/api/process-executions/steps/${waitingId}/start`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", quality.csrfToken)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("공정 시작 시 활성 예약을 출고·소비로 전환한다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    const stepId = prisma.stepIdOf("WO-2026-097", "절단 1공정");
    const lotBefore = prisma.materialLots[0]!;
    const lotSnapshot = {
      onHand: lotBefore.onHand,
      reserved: lotBefore.reservedQuantity,
      consumed: lotBefore.consumedQuantity,
    };
    prisma.materialAllocations.push({
      id: "alloc-x",
      workOrderId: "work-order-7",
      materialLotId: lotBefore.id,
      quantity: 40,
      status: "ACTIVE",
      closedReason: null,
      closedAt: null,
    });

    await agent
      .post(`/api/process-executions/steps/${stepId}/start`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(200);

    expect(lotBefore.onHand).toBe(lotSnapshot.onHand - 40);
    expect(lotBefore.reservedQuantity).toBe(lotSnapshot.reserved - 40);
    expect(lotBefore.consumedQuantity).toBe(lotSnapshot.consumed + 40);
    expect(prisma.materialAllocations[0]).toMatchObject({
      status: "CLOSED",
      closedReason: "FULFILLED",
    });
  });

  it("공정 완료는 실적을 기록하고 다음 공정을 실행 가능하게 만든다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    const stepId = prisma.stepIdOf("WO-2026-091", "조립 2공정");

    await agent
      .post(`/api/process-executions/steps/${stepId}/complete`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ goodQuantity: 110, defectQuantity: 5, memo: "검증 완료 실적" })
      .expect(200);

    const step = prisma.processSteps.find((row) => row.id === stepId);
    expect(step).toMatchObject({
      readiness: "COMPLETED",
      goodQuantity: 110,
      defectQuantity: 5,
      executionMemo: "검증 완료 실적",
    });

    const following = prisma.processSteps.find(
      (row) => row.workOrderId === step?.workOrderId && row.processStepName === "최종 검사",
    );
    expect(following?.readiness).toBe("READY");

    const order = prisma.workOrders.find((row) => row.orderNumber === "WO-2026-091");
    expect(order?.progressPercent).toBeGreaterThan(0);
    expect(
      prisma.auditEvents.some((event) => event.action === "PROCESS_COMPLETED"),
    ).toBe(true);
  });

  it("완료 입력·상태 검증을 계약 code로 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    const readyId = prisma.stepIdOf("WO-2026-094", "최종 검사");

    await agent
      .post(`/api/process-executions/steps/${readyId}/complete`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ goodQuantity: 10, defectQuantity: 0 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("PROCESS_NOT_IN_PROGRESS"));

    const inProgressId = prisma.stepIdOf("WO-2026-091", "조립 2공정");
    await agent
      .post(`/api/process-executions/steps/${inProgressId}/complete`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ goodQuantity: 0, defectQuantity: 0 })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_PROCESS_EXECUTION_INPUT"));
    await agent
      .post(`/api/process-executions/steps/${inProgressId}/complete`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ goodQuantity: -1, defectQuantity: 5 })
      .expect(400);
  });

  it("CSRF token 없이는 공정 command를 거부한다", async () => {
    const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");
    const stepId = prisma.stepIdOf("WO-2026-097", "절단 1공정");
    await agent
      .post(`/api/process-executions/steps/${stepId}/start`)
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));
  });
});
