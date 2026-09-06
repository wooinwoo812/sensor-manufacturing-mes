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
import { DEMO_PROCESS_STEPS } from "../prisma/demo-process-steps.js";
import { DEMO_WORK_ORDERS } from "../prisma/demo-work-orders.js";

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
  readonly auditEvents: {
    id: string;
    occurredAt: Date;
    entityType: string;
    entityId: string;
    action: string;
    summary: string;
    actorName: string;
    actorRole: string;
  }[] = [];
  readonly inspections = DEMO_INSPECTIONS.map((inspection, index) => ({
    ...inspection,
    id: `inspection-${index + 1}`,
    verdictMemo: inspection.verdict === "PASS" ? "전 항목 기준 내" : null,
    createdAt: new Date(),
    workOrderId: `work-order-${DEMO_WORK_ORDERS.findIndex(order => order.orderNumber === inspection.workOrderNumber) + 1}`,
    decisions: [],
    workOrder: { ...DEMO_WORK_ORDERS.find(order => order.orderNumber === inspection.workOrderNumber),
      processSteps: DEMO_PROCESS_STEPS.filter(step => step.workOrderNumber === inspection.workOrderNumber),
    },
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
    for (const inspection of this.inspections) {
      if (inspection.verdict !== null) {
        this.auditEvents.push({
          id: `audit-${++this.sequence}`,
          occurredAt: new Date(Date.now() - this.sequence * 3_600_000),
          entityType: "INSPECTION",
          entityId: inspection.inspectionNumber,
          action: "INSPECTION_VERDICTED",
          summary: `${inspection.specName} 판정 기록 (${inspection.productionLotNumber})`,
          actorName: "품질 데모",
          actorRole: "QUALITY_ENGINEER",
        });
      }
    }
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
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where?: { entityType?: string; entityId?: string };
      orderBy?: { occurredAt?: string };
      take?: number;
    }) => {
      let rows = this.auditEvents.filter(
        (event) =>
          (where?.entityType === undefined ||
            event.entityType === where.entityType) &&
          (where?.entityId === undefined || event.entityId === where.entityId),
      );
      if (orderBy?.occurredAt === "desc") {
        rows = [...rows].sort(
          (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
        );
      }
      return take === undefined ? rows : rows.slice(0, take);
    },
  };

  readonly inspection = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.inspections.find((inspection) => inspection.id === where.id) ?? null,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("inspection detail", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "inspection-detail-salt");
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

  it("세션 없이는 검사 상세를 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/inspections/inspection-1")
      .set("Origin", allowedOrigin)
      .expect(401);
  });

  it("검사 상세에 작업지시·판정 메모·감사 이력을 함께 반환한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");

    const response = await agent
      .get(`/api/inspections/${prisma.inspectionIdOf("INSP-2026-0103")}`)
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body).toMatchObject({
      inspectionNumber: "INSP-2026-0103",
      executionStatus: "COMPLETED",
      verdict: "PASS",
      verdictMemo: "전 항목 기준 내",
    });
    expect(response.body.workOrderNumber).toBeDefined();
    expect(response.body.productName).toBeDefined();
    expect(response.body.recentAudits.length).toBeGreaterThan(0);
    expect(response.body.recentAudits[0]).toMatchObject({
      action: "INSPECTION_VERDICTED",
    });
  });

  it("미판정 검사도 verdict null과 함께 상세를 반환한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");

    const response = await agent
      .get(`/api/inspections/${prisma.inspectionIdOf("INSP-2026-0106")}`)
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body).toMatchObject({
      inspectionNumber: "INSP-2026-0106",
      verdict: null,
      verdictMemo: null,
    });
  });

  it("존재하지 않는 검사는 계약 code로 404를 반환한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");

    await agent
      .get("/api/inspections/inspection-unknown")
      .set("Origin", allowedOrigin)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe("INSPECTION_NOT_FOUND"));
  });

  it("검사 읽기 권한이 없는 역할은 403으로 거부된다", async () => {
    const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");

    await agent
      .get("/api/inspections/inspection-1")
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });
});
