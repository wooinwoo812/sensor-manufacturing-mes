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

interface FakeTraceNode {
  id: string;
  nodeType: "MATERIAL_LOT" | "PRODUCTION_LOT" | "FINISHED_UNIT";
  label: string;
  materialLotId: string | null;
  productionLotNumber: string | null;
  createdAt: Date;
}

interface FakeLotRelation {
  id: string;
  relationType: "CONSUME" | "SPLIT" | "MERGE" | "TRANSFORM" | "SERIALIZE";
  quantity: number;
  parentNodeId: string;
  childNodeId: string;
  processStepExecutionId: string | null;
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

  readonly traceNodes: FakeTraceNode[] = [
    {
      id: "trace-m-1",
      nodeType: "MATERIAL_LOT",
      label: "ML-2026-0301",
      materialLotId: "lot-1",
      productionLotNumber: null,
      createdAt: new Date("2026-09-01T02:00:00Z"),
    },
    {
      id: "trace-m-2",
      nodeType: "MATERIAL_LOT",
      label: "ML-2026-0302",
      materialLotId: "lot-2",
      productionLotNumber: null,
      createdAt: new Date("2026-09-01T02:05:00Z"),
    },
    {
      id: "trace-m-3",
      nodeType: "MATERIAL_LOT",
      label: "ML-2026-0331",
      materialLotId: "lot-9",
      productionLotNumber: null,
      createdAt: new Date("2026-09-01T02:10:00Z"),
    },
    {
      id: "trace-p-1",
      nodeType: "PRODUCTION_LOT",
      label: "PL-2026-091A",
      materialLotId: null,
      productionLotNumber: "PL-2026-091A",
      createdAt: new Date("2026-09-02T01:00:00Z"),
    },
    {
      id: "trace-p-2",
      nodeType: "PRODUCTION_LOT",
      label: "PL-2026-095A",
      materialLotId: null,
      productionLotNumber: "PL-2026-095A",
      createdAt: new Date("2026-09-02T01:30:00Z"),
    },
    {
      id: "trace-p-3",
      nodeType: "PRODUCTION_LOT",
      label: "PL-2026-097A",
      materialLotId: null,
      productionLotNumber: "PL-2026-097A",
      createdAt: new Date("2026-09-02T02:00:00Z"),
    },
    {
      id: "trace-p-4",
      nodeType: "PRODUCTION_LOT",
      label: "PL-2026-097B",
      materialLotId: null,
      productionLotNumber: "PL-2026-097B",
      createdAt: new Date("2026-09-02T02:10:00Z"),
    },
    {
      id: "trace-f-1",
      nodeType: "FINISHED_UNIT",
      label: "FU-2026-0001",
      materialLotId: null,
      productionLotNumber: null,
      createdAt: new Date("2026-09-03T03:00:00Z"),
    },
  ];

  readonly lotRelations: FakeLotRelation[] = [
    {
      id: "relation-1",
      relationType: "CONSUME",
      quantity: 40,
      parentNodeId: "trace-m-1",
      childNodeId: "trace-p-1",
      processStepExecutionId: "step-1",
      createdAt: new Date("2026-09-02T01:10:00Z"),
    },
    {
      id: "relation-2",
      relationType: "CONSUME",
      quantity: 25,
      parentNodeId: "trace-m-2",
      childNodeId: "trace-p-1",
      processStepExecutionId: "step-1",
      createdAt: new Date("2026-09-02T01:11:00Z"),
    },
    {
      id: "relation-3",
      relationType: "CONSUME",
      quantity: 35,
      parentNodeId: "trace-m-3",
      childNodeId: "trace-p-2",
      processStepExecutionId: "step-7",
      createdAt: new Date("2026-09-02T01:40:00Z"),
    },
    {
      id: "relation-4",
      relationType: "SPLIT",
      quantity: 60,
      parentNodeId: "trace-p-3",
      childNodeId: "trace-p-4",
      processStepExecutionId: null,
      createdAt: new Date("2026-09-02T02:15:00Z"),
    },
    {
      id: "relation-5",
      relationType: "SERIALIZE",
      quantity: 1,
      parentNodeId: "trace-p-2",
      childNodeId: "trace-f-1",
      processStepExecutionId: null,
      createdAt: new Date("2026-09-03T03:05:00Z"),
    },
  ];

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

  private nodeWithCount(node: FakeTraceNode) {
    return {
      ...node,
      _count: {
        parentRelations: this.lotRelations.filter(
          (relation) => relation.parentNodeId === node.id,
        ).length,
        childRelations: this.lotRelations.filter(
          (relation) => relation.childNodeId === node.id,
        ).length,
      },
    };
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

  readonly traceNode = {
    count: async ({ where }: { where?: { AND?: unknown[] } }) => {
      return this.filterNodes(where).length;
    },
    findMany: async ({
      where,
      skip,
      take,
    }: {
      where?: { AND?: unknown[] };
      skip?: number;
      take?: number;
    }) => {
      const rows = this.filterNodes(where)
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((node) => this.nodeWithCount(node));
      return rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const node = this.traceNodes.find((row) => row.id === where.id);
      if (node === undefined) {
        return null;
      }
      return {
        ...node,
        childRelations: this.lotRelations
          .filter((relation) => relation.childNodeId === node.id)
          .map((relation) => ({
            ...relation,
            parentNode: this.traceNodes.find(
              (candidate) => candidate.id === relation.parentNodeId,
            ),
          })),
        parentRelations: this.lotRelations
          .filter((relation) => relation.parentNodeId === node.id)
          .map((relation) => ({
            ...relation,
            childNode: this.traceNodes.find(
              (candidate) => candidate.id === relation.childNodeId,
            ),
          })),
      };
    },
  };

  private filterNodes(where: { AND?: unknown[] } | undefined): FakeTraceNode[] {
    const conditions = where?.AND ?? [];
    return this.traceNodes.filter((node) =>
      conditions.every((condition) => {
        const candidate = condition as {
          label?: { contains?: string; mode?: string };
          nodeType?: { in?: string[] };
        };
        if (candidate.label?.contains !== undefined) {
          if (
            !node.label
              .toLowerCase()
              .includes(candidate.label.contains.toLowerCase())
          ) {
            return false;
          }
        }
        if (candidate.nodeType?.in !== undefined) {
          if (!candidate.nodeType.in.includes(node.nodeType)) {
            return false;
          }
        }
        return true;
      }),
    );
  }

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("traceability nodes", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "trace-e2e-salt");
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

  it("세션 없이는 추적 노드를 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/traceability/nodes")
      .set("Origin", allowedOrigin)
      .expect(401);
  });

  it("추적 읽기 권한이 없는 역할은 403을 받는다", async () => {
    const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");
    await agent
      .get("/api/traceability/nodes")
      .set("Origin", allowedOrigin)
      .expect(403);
  });

  it("LOT 번호로 추적 노드를 검색한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/traceability/nodes?q=0331")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({
      id: "trace-m-3",
      nodeType: "MATERIAL_LOT",
      label: "ML-2026-0331",
      downstreamCount: 1,
      upstreamCount: 0,
    });
  });

  it("nodeType 필터로 생산 LOT만 조회한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");
    const response = await agent
      .get("/api/traceability/nodes?nodeType=PRODUCTION_LOT")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(4);
    expect(
      response.body.items.every(
        (item: { nodeType: string }) => item.nodeType === "PRODUCTION_LOT",
      ),
    ).toBe(true);
  });

  it("nodeType 필터로 완제품 일련번호를 조회한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/traceability/nodes?nodeType=FINISHED_UNIT")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({
      label: "FU-2026-0001",
      nodeType: "FINISHED_UNIT",
    });
  });

  it("허용되지 않는 nodeType은 400을 받는다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    await agent
      .get("/api/traceability/nodes?nodeType=UNKNOWN")
      .set("Origin", allowedOrigin)
      .expect(400);
  });

  it("생산 LOT 상세는 투입 자재를 upstream로 반환한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/traceability/nodes/trace-p-1")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body).toMatchObject({
      id: "trace-p-1",
      nodeType: "PRODUCTION_LOT",
      label: "PL-2026-091A",
    });
    expect(response.body.upstream).toHaveLength(2);
    expect(response.body.upstream[0]).toMatchObject({
      relationType: "CONSUME",
      quantity: 40,
      node: { label: "ML-2026-0301" },
    });
    expect(response.body.downstream).toHaveLength(0);
  });

  it("자재 LOT 상세는 투입된 생산 LOT를 downstream으로 반환한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/traceability/nodes/trace-m-3")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.upstream).toHaveLength(0);
    expect(response.body.downstream).toHaveLength(1);
    expect(response.body.downstream[0]).toMatchObject({
      relationType: "CONSUME",
      quantity: 35,
      node: { label: "PL-2026-095A" },
    });
  });

  it("분할된 생산 LOT 상세는 SPLIT 관계를 downstream으로 반환한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/traceability/nodes/trace-p-3")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.downstream).toHaveLength(1);
    expect(response.body.downstream[0]).toMatchObject({
      relationType: "SPLIT",
      quantity: 60,
      node: { label: "PL-2026-097B", nodeType: "PRODUCTION_LOT" },
    });
  });

  it("시리얼화된 생산 LOT 상세는 완제품 일련번호를 downstream으로 반환한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/traceability/nodes/trace-p-2")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.downstream).toHaveLength(1);
    expect(response.body.downstream[0]).toMatchObject({
      relationType: "SERIALIZE",
      quantity: 1,
      node: { label: "FU-2026-0001", nodeType: "FINISHED_UNIT" },
    });
  });

  it("완제품 일련번호 상세는 시리얼화 원천 LOT를 upstream으로 반환한다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    const response = await agent
      .get("/api/traceability/nodes/trace-f-1")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.upstream).toHaveLength(1);
    expect(response.body.upstream[0]).toMatchObject({
      relationType: "SERIALIZE",
      node: { label: "PL-2026-095A", nodeType: "PRODUCTION_LOT" },
    });
    expect(response.body.downstream).toHaveLength(0);
  });

  it("존재하지 않는 추적 노드는 404를 받는다", async () => {
    const { agent } = await loginAs("QUALITY_ENGINEER");
    await agent
      .get("/api/traceability/nodes/trace-none")
      .set("Origin", allowedOrigin)
      .expect(404);
  });
});
