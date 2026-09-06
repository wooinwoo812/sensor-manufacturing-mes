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
import { DEMO_MATERIAL_LOTS, DEMO_MATERIALS } from "../prisma/demo-material-lots.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

interface FakeAllocationRow {
  id: string;
  workOrderId: string;
  materialLotId: string;
  quantity: number;
  status: string;
  closedAt: Date | null;
  closedReason: string | null;
  createdAt: Date;
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
    createdAt: new Date(),
  }));
  readonly materialLots = DEMO_MATERIAL_LOTS.map((lot, index) => {
    const material = DEMO_MATERIALS.find((item) => item.code === lot.materialCode);
    return {
      ...lot,
      qualityDisposition: lot.qualityDisposition,
      id: `material-lot-${index + 1}`,
      materialId: `material-${lot.materialCode}`,
      material: material ?? { code: lot.materialCode, name: lot.materialCode, unit: "EA" },
      createdAt: new Date(),
    };
  });
  readonly materialAllocations: FakeAllocationRow[] = [];

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

  orderNumberToId(orderNumber: string): string {
    return `work-order-${DEMO_WORK_ORDERS.findIndex((o) => o.orderNumber === orderNumber) + 1}`;
  }

  lotNumberToId(lotNumber: string): string {
    return `material-lot-${DEMO_MATERIAL_LOTS.findIndex((l) => l.lotNumber === lotNumber) + 1}`;
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
    create: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
    update: async () => {
      throw new Error("이 테스트에서는 사용하지 않습니다.");
    },
    count: async () => this.workOrders.length,
  };

  readonly processStepExecution = { findMany: async () => [] };
  readonly inspection = { findMany: async () => [] };
  readonly workOrderMaterialRequirement = { findMany: async () => [] };

  readonly materialLot = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.materialLots.find((lot) => lot.id === where.id) ?? null,
    findMany: async () => this.materialLots,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { reservedQuantity?: { increment?: number; decrement?: number } };
    }) => {
      const lot = this.materialLots.find((row) => row.id === where.id);
      if (lot === undefined) {
        throw new Error("자재 LOT이 없습니다.");
      }
      if (data.reservedQuantity?.increment !== undefined) {
        lot.reservedQuantity += data.reservedQuantity.increment;
      }
      if (data.reservedQuantity?.decrement !== undefined) {
        lot.reservedQuantity -= data.reservedQuantity.decrement;
      }
      return lot;
    },
    count: async () => this.materialLots.length,
  };

  readonly materialAllocation = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.materialAllocations.find((row) => row.id === where.id) ?? null,
    findMany: async ({
      where,
    }: {
      where?: { workOrderId?: string };
    }) =>
      this.materialAllocations
        .filter(
          (row) =>
            where?.workOrderId === undefined || row.workOrderId === where.workOrderId,
        )
        .map((row) => ({
          ...row,
          materialLot:
            this.materialLots.find((lot) => lot.id === row.materialLotId) ?? null,
        })),
    create: async ({ data }: { data: Omit<FakeAllocationRow, "id" | "createdAt"> }) => {
      const row: FakeAllocationRow = {
        ...data,
        id: `allocation-${++this.sequence}`,
        createdAt: new Date(),
      };
      this.materialAllocations.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeAllocationRow>;
    }) => {
      const row = this.materialAllocations.find((candidate) => candidate.id === where.id);
      if (row === undefined) {
        throw new Error("예약이 없습니다.");
      }
      Object.assign(row, data);
      return row;
    },
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("material reservations", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "reservation-e2e-salt");
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

  it("세션 없이는 예약 목록을 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get(`/api/work-orders/x/material-reservations`)
      .set("Origin", allowedOrigin)
      .expect(401);
  });

  it("발행된 작업지시에 가용 자재를 예약하고 감사를 남긴다", async () => {
    const { agent, csrfToken } = await loginAs("MATERIAL_MANAGER");
    const workOrderId = prisma.orderNumberToId("WO-2026-092");
    const lotId = prisma.lotNumberToId("ML-2026-0301");

    const response = await agent
      .post(`/api/work-orders/${workOrderId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ materialLotId: lotId, quantity: 50 })
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      lotNumber: "ML-2026-0301",
      quantity: 50,
      status: "ACTIVE",
    });
    const lot = prisma.materialLots.find((row) => row.id === lotId);
    expect(lot?.reservedQuantity).toBe(170);
    expect(
      prisma.auditEvents.some(
        (event) => event.action === "MATERIAL_RESERVED" && event.entityId === "WO-2026-092",
      ),
    ).toBe(true);
  });

  it("초안·품질 통제·가용 초과 예약을 계약 code로 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("MATERIAL_MANAGER");

    const draftId = prisma.orderNumberToId("WO-2026-093");
    await agent
      .post(`/api/work-orders/${draftId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ materialLotId: prisma.lotNumberToId("ML-2026-0301"), quantity: 10 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("RESERVATION_NOT_RELEASED"));

    const releasedId = prisma.orderNumberToId("WO-2026-092");
    await agent
      .post(`/api/work-orders/${releasedId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ materialLotId: prisma.lotNumberToId("ML-2026-0323"), quantity: 10 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("MATERIAL_LOT_UNAVAILABLE"));

    await agent
      .post(`/api/work-orders/${releasedId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ materialLotId: prisma.lotNumberToId("ML-2026-0301"), quantity: 999 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("MATERIAL_LOT_INSUFFICIENT"));

    await agent
      .post(`/api/work-orders/${releasedId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ materialLotId: prisma.lotNumberToId("ML-2026-0301"), quantity: 0 })
      .expect(400);
  });

  it("예약 생성 권한이 없는 역할은 403으로 거부된다", async () => {
    const { agent, csrfToken } = await loginAs("PRODUCTION_PLANNER");
    const releasedId = prisma.orderNumberToId("WO-2026-092");
    await agent
      .post(`/api/work-orders/${releasedId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ materialLotId: prisma.lotNumberToId("ML-2026-0301"), quantity: 10 })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("PERMISSION_DENIED"));
  });

  it("예약 해제는 잔량을 되돌리고 재해제를 거부한다", async () => {
    const { agent, csrfToken } = await loginAs("MATERIAL_MANAGER");
    const workOrderId = prisma.orderNumberToId("WO-2026-092");
    const lotId = prisma.lotNumberToId("ML-2026-0301");

    const reserved = await agent
      .post(`/api/work-orders/${workOrderId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .send({ materialLotId: lotId, quantity: 30 })
      .expect(200);
    const allocationId = reserved.body[0].id as string;

    const before = prisma.materialLots.find((row) => row.id === lotId)?.reservedQuantity;
    const released = await agent
      .post(`/api/material-allocations/${allocationId}/release`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(200);
    expect(released.body[0]).toMatchObject({ status: "CLOSED", closedReason: "RELEASED" });
    const after = prisma.materialLots.find((row) => row.id === lotId)?.reservedQuantity;
    expect(after).toBe((before ?? 0) - 30);
    expect(
      prisma.auditEvents.some((event) => event.action === "MATERIAL_RESERVATION_RELEASED"),
    ).toBe(true);

    await agent
      .post(`/api/material-allocations/${allocationId}/release`)
      .set("Origin", allowedOrigin)
      .set("x-csrf-token", csrfToken)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe("MATERIAL_ALLOCATION_NOT_ACTIVE"));
  });

  it("CSRF token 없이는 예약을 거부한다", async () => {
    const { agent } = await loginAs("MATERIAL_MANAGER");
    const releasedId = prisma.orderNumberToId("WO-2026-092");
    await agent
      .post(`/api/work-orders/${releasedId}/material-reservations`)
      .set("Origin", allowedOrigin)
      .send({ materialLotId: prisma.lotNumberToId("ML-2026-0301"), quantity: 10 })
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));
  });
});
