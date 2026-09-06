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
import { DEMO_MATERIAL_LOTS } from "../prisma/demo-material-lots.js";

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

  readonly workOrder = {
    findMany: async () => DEMO_WORK_ORDERS.map((order) => ({ ...order })),
  };
  readonly processStepExecution = {
    findMany: async () =>
      DEMO_PROCESS_STEPS.map((step) => ({
        productionLotNumber: step.productionLotNumber,
        readiness: step.readiness,
      })),
  };
  readonly inspection = {
    findMany: async () =>
      DEMO_INSPECTIONS.map((inspection) => ({
        inspectionNumber: inspection.inspectionNumber,
        productionLotNumber: inspection.productionLotNumber,
        gate: inspection.gate,
        executionStatus: inspection.executionStatus,
        verdict: inspection.verdict,
      })),
  };
  readonly materialLot = {
    findMany: async () =>
      DEMO_MATERIAL_LOTS.map((lot) => ({
        qualityDisposition: lot.qualityDisposition,
        expiresAt: lot.expiresAt,
        onHand: lot.onHand,
        reservedQuantity: lot.reservedQuantity,
      })),
  };

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

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("dashboard summary API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "dashboard-e2e-salt");
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

  it("세션 없이는 대시보드 요약을 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/dashboard/summary")
      .set("Origin", allowedOrigin)
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_REQUIRED"));
  });

  it("대시보드 읽기 권한이 없는 역할은 403으로 거부된다", async () => {
    const materialManager = await loginAs("MATERIAL_MANAGER");
    await materialManager
      .get("/api/dashboard/summary")
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("seed 전체에서 집계 지표를 계산한다", async () => {
    const agent = await loginAs("PRODUCTION_PLANNER");
    const response = await agent
      .get("/api/dashboard/summary")
      .set("Origin", allowedOrigin)
      .expect(200);

    const { metrics, weekly, weeklyTotals, attentionQueue } = response.body;

    expect(metrics.workOrders.inProgress).toBe(3);
    expect(metrics.workOrders.blocked).toBe(3);
    expect(metrics.workOrders.overdue).toBe(1);
    expect(metrics.productionLots.distinct).toBe(6);
    expect(metrics.productionLots.inProgress).toBe(2);
    expect(metrics.inspections.pending).toBe(4);
    expect(metrics.inspections.failed).toBe(1);
    expect(metrics.inspections.hold).toBe(1);
    expect(metrics.materialLots.quarantined).toBe(1);
    expect(metrics.materialLots.expired).toBe(1);
    expect(metrics.materialLots.shortage).toBeGreaterThanOrEqual(1);

    expect(weekly).toHaveLength(7);
    expect(weekly[0].weekday).toBe("월");
    const plannedSum = weekly.reduce(
      (sum: number, point: { plannedQuantity: number }) => sum + point.plannedQuantity,
      0,
    );
    expect(weeklyTotals.planned).toBe(plannedSum);
    expect(weeklyTotals.completionRate).toBeGreaterThanOrEqual(0);
    expect(weeklyTotals.completionRate).toBeLessThanOrEqual(100);

    const blockedItems = attentionQueue.filter((item: { status: string }) => item.status === "차단");
    expect(blockedItems.map((item: { code: string }) => item.code).sort()).toEqual([
      "WO-2026-092",
      "WO-2026-094",
      "WO-2026-098",
    ]);
    expect(attentionQueue.length).toBeLessThanOrEqual(5);
  });
});
