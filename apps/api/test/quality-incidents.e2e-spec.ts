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
import { DEMO_QUALITY_INCIDENTS } from "../prisma/demo-quality-incidents.js";

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

interface FakeQualityIncident {
  id: string;
  incidentNumber: string;
  title: string;
  sourceType: string;
  sourceLotNumber: string;
  description: string | null;
  status: string;
  detectedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
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
  readonly qualityIncidents: FakeQualityIncident[] = DEMO_QUALITY_INCIDENTS.map(
    (incident, index) => ({
      ...incident,
      sourceType: incident.sourceType,
      status: incident.status,
      id: `incident-${index + 1}`,
      createdAt: new Date(),
    }),
  );
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
    create: async ({ data }: { data: { action: string; entityId: string } }) => {
      const row = { id: `audit-${++this.sequence}`, ...data };
      this.auditEvents.push(row);
      return row;
    },
    findMany: async () => this.auditEvents,
  };

  readonly materialLot = {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; lotNumber?: string };
    }) =>
      this.materialLots.find(
        (lot) =>
          (where.id !== undefined && lot.id === where.id) ||
          (where.lotNumber !== undefined && lot.lotNumber === where.lotNumber),
      ) ?? null,
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
      Object.assign(row, data);
      return row;
    },
  };

  readonly materialAllocation = {
    count: async () => 0,
  };

  readonly qualityIncident = {
    count: async (arg?: {
      where?: Parameters<FakePrismaService["applyIncidentWhere"]>[1];
    }) => this.applyIncidentWhere(this.qualityIncidents, arg?.where).length,
    create: async ({ data }: { data: Partial<FakeQualityIncident> }) => {
      const row: FakeQualityIncident = {
        id: `incident-${++this.sequence}`,
        createdAt: new Date(),
        resolvedAt: null,
        ...data,
      } as FakeQualityIncident;
      this.qualityIncidents.push(row);
      return row;
    },
    findMany: async ({
      where,
      orderBy,
      skip,
      take,
    }: {
      where?: Parameters<FakePrismaService["applyIncidentWhere"]>[1];
      orderBy?: Record<string, string>[];
      skip?: number;
      take?: number;
    }) => {
      let rows = this.applyIncidentWhere(this.qualityIncidents, where);
      const primary = orderBy?.[0] ?? { detectedAt: "desc" };
      const key = Object.keys(primary)[0] as keyof FakeQualityIncident;
      const direction = Object.values(primary)[0] === "asc" ? 1 : -1;
      rows = [...rows].sort((left, right) => {
        const a = left[key];
        const b = right[key];
        if (typeof a === "string" && typeof b === "string") {
          return a.localeCompare(b) * direction;
        }
        if (a instanceof Date && b instanceof Date) {
          return (a.getTime() - b.getTime()) * direction;
        }
        return 0;
      });
      const start = skip ?? 0;
      return rows.slice(start, start + (take ?? rows.length));
    },
  };

  private applyIncidentWhere(
    rows: readonly FakeQualityIncident[],
    where?: {
      status?: { in: string[] };
      sourceType?: { in: string[] };
      OR?: { incidentNumber?: { contains: string }; title?: { contains: string }; sourceLotNumber?: { contains: string } }[];
    },
  ): FakeQualityIncident[] {
    return rows.filter((incident) => {
      if (where?.status?.in !== undefined && !where.status.in.includes(incident.status)) {
        return false;
      }
      if (
        where?.sourceType?.in !== undefined &&
        !where.sourceType.in.includes(incident.sourceType)
      ) {
        return false;
      }
      if (where?.OR !== undefined) {
        const needle =
          where.OR[0]?.incidentNumber?.contains ??
          where.OR[0]?.title?.contains ??
          where.OR[0]?.sourceLotNumber?.contains ??
          "";
        const lower = needle.toLowerCase();
        const matched =
          incident.incidentNumber.toLowerCase().includes(lower) ||
          incident.title.toLowerCase().includes(lower) ||
          incident.sourceLotNumber.toLowerCase().includes(lower);
        if (!matched) {
          return false;
        }
      }
      return true;
    });
  }

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("quality incident list and register command", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "incident-e2e-salt");
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

  it("세션 없이는 부적합 사건을 조회·등록할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .send({ title: "세션 없는 등록 시도" })
      .expect(401);
  });

  it("읽기 권한이 있는 역할은 상태·대상 필터로 목록을 조회한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");

    const response = await agent
      .get("/api/quality-incidents?status=OPEN&sourceType=MATERIAL_LOT")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({
      incidentNumber: "QI-2026-0701",
      status: "OPEN",
      sourceType: "MATERIAL_LOT",
      sourceLotNumber: "ML-2026-0323",
    });
  });

  it("부적합 사건 등록은 원천 자재 LOT를 격리하고 감사를 남긴다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");

    const response = await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({
        title: "적외선 다이오드 어레이 광출력 편차",
        sourceType: "MATERIAL_LOT",
        sourceLotNumber: "ML-2026-0301",
        description: "공정 검사에서 광출력 하한 미달 다수 발견",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      status: "OPEN",
      sourceLotNumber: "ML-2026-0301",
    });
    const incidentNumber = response.body.incidentNumber as string;
    expect(incidentNumber).toMatch(/^QI-\d{4}-\d{4}$/);

    const lot = prisma.materialLots.find((row) => row.lotNumber === "ML-2026-0301");
    expect(lot?.qualityDisposition).toBe("QUARANTINED");
    expect(
      prisma.auditEvents.some(
        (event) =>
          event.action === "QUALITY_INCIDENT_REGISTERED" &&
          event.entityId === incidentNumber,
      ),
    ).toBe(true);
    expect(
      prisma.auditEvents.some(
        (event) =>
          event.action === "MATERIAL_LOT_DISPOSITION_DECIDED" &&
          event.entityId === "ML-2026-0301",
      ),
    ).toBe(true);
  });

  it("이미 격리된 자재 LOT는 사건 등록 시 disposition을 다시 변경하지 않는다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");
    const before = prisma.auditEvents.length;

    await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({
        title: "TE 쿨링 모듈 추가 이상 소음 신고",
        sourceType: "MATERIAL_LOT",
        sourceLotNumber: "ML-2026-0323",
      })
      .expect(201);

    const lot = prisma.materialLots.find((row) => row.lotNumber === "ML-2026-0323");
    expect(lot?.qualityDisposition).toBe("QUARANTINED");
    expect(prisma.auditEvents.length).toBe(before + 1);
  });

  it("폐기 처분된 자재 LOT과 잘못된 입력은 계약 code로 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");

    await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({
        title: "폐기 LOT 사건 등록 시도",
        sourceType: "MATERIAL_LOT",
        sourceLotNumber: "ML-2026-0332",
      })
      .expect(400)
      .expect(({ body }) =>
        expect(body.code).toBe("MATERIAL_LOT_ALREADY_REJECTED"),
      );

    await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ title: "짧음", sourceType: "MATERIAL_LOT", sourceLotNumber: "ML-2026-0301" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.code).toBe("INVALID_QUALITY_INCIDENT_INPUT"),
      );

    await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ title: "올바른 제목입니다", sourceType: "UNKNOWN", sourceLotNumber: "ML-2026-0301" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.code).toBe("INVALID_QUALITY_INCIDENT_INPUT"),
      );

    await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ title: "올바른 제목입니다", sourceType: "MATERIAL_LOT", sourceLotNumber: "ML-0000-0000" })
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe("MATERIAL_LOT_NOT_FOUND"));
  });

  it("등록 권한이 없는 역할은 403으로 거부된다", async () => {
    const { agent, csrfToken } = await loginAs("SHOP_FLOOR_OPERATOR");
    await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({
        title: "현장에서 발견한 이상",
        sourceType: "MATERIAL_LOT",
        sourceLotNumber: "ML-2026-0301",
      })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("CSRF token 없이는 등록을 거부한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    await agent
      .post("/api/quality-incidents")
      .set("Origin", allowedOrigin)
      .send({
        title: "CSRF 없는 등록 시도",
        sourceType: "MATERIAL_LOT",
        sourceLotNumber: "ML-2026-0301",
      })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));
  });
});
