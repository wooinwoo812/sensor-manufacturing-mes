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
import { DEMO_MATERIALS, DEMO_MATERIAL_LOTS } from "../prisma/demo-material-lots.js";

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
  }[] = DEMO_MATERIAL_LOTS.slice(0, 3).flatMap((lot, index) => [
    {
      id: `audit-${index * 2 + 1}`,
      occurredAt: new Date(Date.now() - index * 3_600_000),
      entityType: "MATERIAL_LOT",
      entityId: lot.lotNumber,
      action: "MATERIAL_LOT_DISPOSITION_DECIDED",
      summary: `${lot.lotNumber} 품질 처분 결정 대기 → 합격`,
      actorName: "품질 데모",
      actorRole: "QUALITY_ENGINEER",
    },
    {
      id: `audit-${index * 2 + 2}`,
      occurredAt: new Date(Date.now() - (index + 1) * 7_200_000),
      entityType: "MATERIAL_LOT",
      entityId: lot.lotNumber,
      action: "MATERIAL_RESERVED",
      summary: `${lot.lotNumber} 50EA 예약`,
      actorName: "자재 데모",
      actorRole: "MATERIAL_MANAGER",
    },
  ]);
  readonly materialLots = DEMO_MATERIAL_LOTS.map((lot, index) => ({
    ...lot,
    id: `lot-${index + 1}`,
    lotNumber: lot.lotNumber,
    qualityDisposition: lot.qualityDisposition,
    material: DEMO_MATERIALS.find((m) => m.code === lot.materialCode) ?? {
      code: lot.materialCode,
      name: "자재",
      unit: "EA",
    },
    allocations:
      index === 0
        ? [
            {
              id: "allocation-1",
              quantity: 120,
              status: "ACTIVE",
              closedReason: null,
              createdAt: new Date(Date.now() - 86_400_000),
              workOrder: { orderNumber: "WO-2026-091" },
            },
          ]
        : [],
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

  lotIdOf(lotNumber: string): string {
    const lot = this.materialLots.find((row) => row.lotNumber === lotNumber);
    if (lot === undefined) {
      throw new Error(`자재 LOT seed가 없습니다: ${lotNumber}`);
    }
    return lot.id;
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

  readonly materialLot = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.materialLots.find((lot) => lot.id === where.id) ?? null,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("material lot detail", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "lot-detail-salt");
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

  it("세션 없이는 자재 LOT 상세를 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/material-lots/lot-1")
      .set("Origin", allowedOrigin)
      .expect(401);
  });

  it("자재 LOT 상세에 수량·예약·감사 이력을 함께 반환한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");

    const response = await agent
      .get(`/api/material-lots/${prisma.lotIdOf("ML-2026-0301")}`)
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body).toMatchObject({
      lotNumber: "ML-2026-0301",
      materialCode: "SEN-MAT-014",
      qualityDisposition: "ACCEPTED",
    });
    expect(response.body.allocations).toHaveLength(1);
    expect(response.body.allocations[0]).toMatchObject({
      workOrderNumber: "WO-2026-091",
      quantity: 120,
      status: "ACTIVE",
    });
    expect(response.body.recentAudits.length).toBeGreaterThan(0);
    expect(
      response.body.recentAudits.every(
        (event: { action: string }) =>
          event.action === "MATERIAL_LOT_DISPOSITION_DECIDED" ||
          event.action === "MATERIAL_RESERVED",
      ),
    ).toBe(true);
  });

  it("존재하지 않는 자재 LOT은 계약 code로 404를 반환한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");

    await agent
      .get("/api/material-lots/lot-unknown")
      .set("Origin", allowedOrigin)
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe("MATERIAL_LOT_NOT_FOUND"));
  });

  it("자재 LOT 읽기 권한이 없는 역할은 403으로 거부된다", async () => {
    const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");

    await agent
      .get("/api/material-lots/lot-1")
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });
});
