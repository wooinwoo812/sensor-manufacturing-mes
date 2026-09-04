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
import { DEMO_AUDIT_EVENTS } from "../prisma/demo-audit-events.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

interface FakeAuditRow {
  id: string;
  occurredAt: Date;
  actorId: string;
  actorRole: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  requestId: string;
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
  readonly auditEvents: FakeAuditRow[] = DEMO_AUDIT_EVENTS.map((event, index) => ({
    ...event,
    actorRole: event.actorRole,
    action: event.action,
    id: `audit-${index + 1}`,
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
      [...this.auditEvents.filter((row) => matchesWhere(row, where))]
        .sort((left, right) => {
          for (const clause of orderBy) {
            for (const [field, direction] of Object.entries(clause)) {
              const comparison =
                left[field as keyof FakeAuditRow] > right[field as keyof FakeAuditRow]
                  ? 1
                  : left[field as keyof FakeAuditRow] < right[field as keyof FakeAuditRow]
                    ? -1
                    : 0;
              if (comparison !== 0) {
                return direction === "asc" ? comparison : -comparison;
              }
            }
          }
          return 0;
        })
        .slice(skip, skip + take),
    count: async ({ where = {} }: { where?: Record<string, unknown> }) =>
      this.auditEvents.filter((row) => matchesWhere(row, where)).length,
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

function matchesWhere(row: FakeAuditRow, where: Record<string, unknown>) {
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
    if (field === "occurredAt" && typeof condition === "object" && condition !== null) {
      const filter = condition as { gte?: Date; lte?: Date };
      const time = row.occurredAt.getTime();
      if (filter.gte !== undefined && time < filter.gte.getTime()) {
        return false;
      }
      if (filter.lte !== undefined && time > filter.lte.getTime()) {
        return false;
      }
      continue;
    }
    const value = row[field as keyof FakeAuditRow];
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

describe("audit event list API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "audit-e2e-salt");
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

  it("세션 없이는 감사 이벤트를 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/audit-events")
      .set("Origin", allowedOrigin)
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_REQUIRED"));
  });

  it("감사 읽기 권한이 없는 역할은 403으로 거부된다", async () => {
    const planner = await loginAs("PRODUCTION_PLANNER");
    await planner
      .get("/api/audit-events")
      .set("Origin", allowedOrigin)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("기본 목록은 최근 사건 순서로 전체를 반환한다", async () => {
    const agent = await loginAs("SYSTEM_ADMIN");
    const response = await agent
      .get("/api/audit-events")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(DEMO_AUDIT_EVENTS.length);
    expect(response.body.items[0]).toMatchObject({
      action: "INSPECTION_VERDICTED",
      entityId: "INSP-2026-0107",
      actorRole: "QUALITY_ENGINEER",
    });
  });

  it("actorRole과 action 필터를 지원한다", async () => {
    const agent = await loginAs("SYSTEM_ADMIN");

    const plannerEvents = await agent
      .get("/api/audit-events")
      .query({ actorRole: "PRODUCTION_PLANNER" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(plannerEvents.body.total).toBe(4);

    const verdicts = await agent
      .get("/api/audit-events")
      .query({ action: "INSPECTION_VERDICTED" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(verdicts.body.total).toBe(2);
  });

  it("entityType·requestId·시간 범위 필터를 지원한다", async () => {
    const agent = await loginAs("SYSTEM_ADMIN");

    const inspections = await agent
      .get("/api/audit-events")
      .query({ entityType: "INSPECTION" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(inspections.body.total).toBe(2);

    const byRequest = await agent
      .get("/api/audit-events")
      .query({ requestId: "req-2026-09-03-0031" })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(byRequest.body.total).toBe(1);

    const recent = await agent
      .get("/api/audit-events")
      .query({ from: new Date(Date.now() - 24 * 3_600_000).toISOString() })
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(recent.body.total).toBe(3);
  });

  it("q 검색은 요약·대상·행위자·요청 ID를 포괄한다", async () => {
    const agent = await loginAs("SYSTEM_ADMIN");
    const response = await agent
      .get("/api/audit-events")
      .query({ q: "격리" })
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].entityId).toBe("ML-2026-0323");
  });

  it("허용되지 않은 조회 조건은 400으로 거부한다", async () => {
    const agent = await loginAs("SYSTEM_ADMIN");
    await agent
      .get("/api/audit-events")
      .query({ action: "DELETED_DATABASE" })
      .set("Origin", allowedOrigin)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe("INVALID_AUDIT_EVENT_QUERY"));
    await agent
      .get("/api/audit-events")
      .query({ from: "어제" })
      .set("Origin", allowedOrigin)
      .expect(400);
  });
});
