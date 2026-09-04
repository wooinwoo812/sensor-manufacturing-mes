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
  readonly auditEvents: { id: string; action: string; entityId: string; summary: string }[] = [];
  readonly materialAllocations: {
    id: string;
    workOrderId: string;
    materialLotId: string;
    quantity: number;
    status: string;
  }[] = [
    {
      id: "allocation-1",
      workOrderId: "work-order-1",
      materialLotId: "lot-5",
      quantity: 50,
      status: "ACTIVE",
    },
  ];
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
    create: async ({
      data,
    }: {
      data: { action: string; entityId: string; summary: string };
    }) => {
      const row = { id: `audit-${++this.sequence}`, ...data };
      this.auditEvents.push(row);
      return row;
    },
    findMany: async () => this.auditEvents,
  };

  readonly materialAllocation = {
    count: async ({
      where,
    }: {
      where?: { materialLotId?: string; status?: string };
    }) =>
      this.materialAllocations.filter(
        (row) =>
          (where?.materialLotId === undefined ||
            row.materialLotId === where.materialLotId) &&
          (where?.status === undefined || row.status === where.status),
      ).length,
  };

  readonly materialLot = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.materialLots.find((lot) => lot.id === where.id) ?? null,
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
          record[key] =
            (record[key] ?? 0) + (value as { increment: number }).increment;
        } else {
          Object.assign(row, { [key]: value });
        }
      }
      return row;
    },
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("material lot quality disposition command", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "disposition-e2e-salt");
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

  it("세션 없이는 품질 처분을 실행할 수 없다", async () => {
    await request(app.getHttpServer())
      .post(`/api/material-lots/lot-1/disposition`)
      .set("Origin", allowedOrigin)
      .send({ disposition: "ACCEPTED" })
      .expect(401);
  });

  it("PENDING 자재 LOT를 합격 처분하고 감사를 남긴다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");
    const lotId = prisma.lotIdOf("ML-2026-0312");

    const response = await agent
      .post(`/api/material-lots/${lotId}/disposition`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ disposition: "ACCEPTED", memo: "수입검사 전 항목 기준 내" })
      .expect(200);

    expect(response.body.lot).toMatchObject({
      lotNumber: "ML-2026-0312",
      previousDisposition: "PENDING",
      disposition: "ACCEPTED",
    });
    const lot = prisma.materialLots.find((row) => row.lotNumber === "ML-2026-0312");
    expect(lot?.qualityDisposition).toBe("ACCEPTED");
    expect(
      prisma.auditEvents.some(
        (event) =>
          event.action === "MATERIAL_LOT_DISPOSITION_DECIDED" &&
          event.entityId === "ML-2026-0312",
      ),
    ).toBe(true);
  });

  it("QUARANTINED 자재 LOT의 폐기 처분은 잔여 onHand를 폐기 수량으로 이관한다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");
    const lotId = prisma.lotIdOf("ML-2026-0323");
    const lotBefore = prisma.materialLots.find(
      (row) => row.lotNumber === "ML-2026-0323",
    );
    expect(lotBefore?.onHand).toBe(100);

    const response = await agent
      .post(`/api/material-lots/${lotId}/disposition`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ disposition: "REJECTED", memo: "재검사 결과 복원 불가 판정" })
      .expect(200);

    expect(response.body.lot).toMatchObject({
      previousDisposition: "QUARANTINED",
      disposition: "REJECTED",
      onHand: 0,
      scrappedQuantity: 100,
      availableQuantityAfter: 0,
    });
  });

  it("ACCEPTED 자재 LOT의 직접 처분은 사건 등록을 안내하며 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");
    const lotId = prisma.lotIdOf("ML-2026-0301");

    await agent
      .post(`/api/material-lots/${lotId}/disposition`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ disposition: "HOLD" })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe("MATERIAL_LOT_DISPOSITION_FORBIDDEN"),
      );
  });

  it("활성 예약이 남은 자재 LOT의 폐기 처분은 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");
    const lotId = prisma.lotIdOf("ML-2026-0312");

    await agent
      .post(`/api/material-lots/${lotId}/disposition`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ disposition: "REJECTED" })
      .expect(409)
      .expect(({ body }) =>
        expect(body.code).toBe("MATERIAL_LOT_HAS_ACTIVE_RESERVATIONS"),
      );
  });

  it("잘못된 처분 값은 계약 code로 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("QUALITY_ENGINEER");
    const lotId = prisma.lotIdOf("ML-2026-0312");

    await agent
      .post(`/api/material-lots/${lotId}/disposition`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ disposition: "QUARANTINED" })
      .expect(400)
      .expect(({ body }) =>
        expect(body.code).toBe("INVALID_MATERIAL_LOT_DISPOSITION_INPUT"),
      );
  });

  it("처분 권한이 없는 역할은 403으로 거부된다", async () => {
    const { agent, csrfToken } = await loginAs("MATERIAL_MANAGER");
    const lotId = prisma.lotIdOf("ML-2026-0312");

    await agent
      .post(`/api/material-lots/${lotId}/disposition`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ disposition: "ACCEPTED" })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("CSRF token 없이는 처분을 거부한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const lotId = prisma.lotIdOf("ML-2026-0312");

    await agent
      .post(`/api/material-lots/${lotId}/disposition`)
      .set("Origin", allowedOrigin)
      .send({ disposition: "ACCEPTED" })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));
  });
});
