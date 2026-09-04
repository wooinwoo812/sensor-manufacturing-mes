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

  readonly bomRevisions = [
    {
      id: "bom-1",
      revisionNumber: "BOM-2026-R003",
      productId: "product-1",
      description: "TE 쿨링 모듈 사양 반영 발행본",
      lifecycle: "PUBLISHED",
      createdAt: new Date("2026-08-20T01:00:00Z"),
      product: {
        id: "product-1",
        code: "SEN-PROD-001",
        name: "다목적 환경 센서 모듈",
        baseUom: "EA",
      },
      items: [
        {
          id: "bom-item-1",
          materialId: "material-1",
          quantityPerProductBaseUom: { toString: () => "2.000000" },
          material: {
            id: "material-1",
            code: "SEN-MAT-014",
            name: "적외선 감지 다이오드 어레이",
            unit: "EA",
          },
        },
        {
          id: "bom-item-2",
          materialId: "material-2",
          quantityPerProductBaseUom: { toString: () => "1.000000" },
          material: {
            id: "material-2",
            code: "SEN-MAT-032",
            name: "TE 쿨링 모듈",
            unit: "EA",
          },
        },
      ],
    },
    {
      id: "bom-2",
      revisionNumber: "BOM-2026-R005-DRAFT",
      productId: "product-1",
      description: null,
      lifecycle: "DRAFT",
      createdAt: new Date("2026-09-01T03:00:00Z"),
      product: {
        id: "product-1",
        code: "SEN-PROD-001",
        name: "다목적 환경 센서 모듈",
        baseUom: "EA",
      },
      items: [],
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

  private filterRevisions(
    where: { AND?: unknown[] } | undefined,
  ) {
    const conditions = where?.AND ?? [];
    return this.bomRevisions.filter((row) =>
      conditions.every((condition) => {
        const candidate = condition as {
          OR?: {
            revisionNumber?: { contains?: string; mode?: string };
            product?: {
              OR: {
                code?: { contains?: string };
                name?: { contains?: string };
              }[];
            };
          };
          lifecycle?: { in?: string[] };
          productId?: string;
        };
        if (candidate.productId !== undefined) {
          if (row.productId !== candidate.productId) {
            return false;
          }
        }
        if (candidate.lifecycle?.in !== undefined) {
          if (!candidate.lifecycle.in.includes(row.lifecycle)) {
            return false;
          }
        }
        if (candidate.OR !== undefined) {
          const orTerms = candidate.OR as {
            revisionNumber?: { contains?: string };
            product?: {
              OR: {
                code?: { contains?: string };
                name?: { contains?: string };
              }[];
            };
          }[];
          const q = orTerms[0]?.revisionNumber?.contains?.toLowerCase();
          const productTerms = orTerms[1]?.product?.OR ?? [];
          const codeTerm = productTerms[0]?.code?.contains?.toLowerCase();
          const nameTerm = productTerms[1]?.name?.contains?.toLowerCase();
          const matched =
            (q !== undefined && row.revisionNumber.toLowerCase().includes(q)) ||
            (codeTerm !== undefined &&
              row.product.code.toLowerCase().includes(codeTerm)) ||
            (nameTerm !== undefined &&
              row.product.name.toLowerCase().includes(nameTerm));
          if (!matched) {
            return false;
          }
        }
        return true;
      }),
    );
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

  readonly bomRevision = {
    count: async ({ where }: { where?: { AND?: unknown[] } }) =>
      this.filterRevisions(where).length,
    findMany: async ({
      where,
      skip,
      take,
    }: {
      where?: { AND?: unknown[] };
      skip?: number;
      take?: number;
    }) => {
      const rows = this.filterRevisions(where)
        .sort(
          (a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime() ||
            a.revisionNumber.localeCompare(b.revisionNumber),
        )
        .map((row) => ({
          ...row,
          items: [...row.items].sort((a, b) =>
            a.material.code.localeCompare(b.material.code),
          ),
        }));
      return rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
    },
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("materials/boms list API", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "bom-e2e-salt");
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

  it("세션 없이는 BOM을 조회할 수 없다", async () => {
    await request(app.getHttpServer())
      .get("/api/materials/boms")
      .set("Origin", allowedOrigin)
      .expect(401);
  });

  it("기준정보 읽기 권한이 없는 역할은 403을 받는다", async () => {
    const { agent } = await loginAs("SHOP_FLOOR_OPERATOR");
    await agent
      .get("/api/materials/boms")
      .set("Origin", allowedOrigin)
      .expect(403);
  });

  it("BOM revision 목록과 항목을 반환한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");
    const response = await agent
      .get("/api/materials/boms")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(2);
    const published = response.body.items.find(
      (item: { revisionNumber: string }) =>
        item.revisionNumber === "BOM-2026-R003",
    );
    expect(published).toMatchObject({
      productCode: "SEN-PROD-001",
      lifecycle: "PUBLISHED",
    });
    expect(published.items).toHaveLength(2);
    expect(published.items[0]).toMatchObject({
      materialCode: "SEN-MAT-014",
      quantityPerProductBaseUom: "2.000000",
    });
  });

  it("revision 번호·제품 코드·제품명으로 검색한다", async () => {
    const { agent } = await loginAs("MATERIAL_MANAGER");
    const byRevision = await agent
      .get("/api/materials/boms?q=R003")
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(byRevision.body.total).toBe(1);

    const byProduct = await agent
      .get("/api/materials/boms?q=온습도")
      .set("Origin", allowedOrigin)
      .expect(200);
    expect(byProduct.body.total).toBe(0);
  });

  it("lifecycle 필터로 발행본만 조회한다", async () => {
    const { agent } = await loginAs("PRODUCTION_PLANNER");
    const response = await agent
      .get("/api/materials/boms?lifecycle=PUBLISHED")
      .set("Origin", allowedOrigin)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].lifecycle).toBe("PUBLISHED");
  });

  it("허용되지 않는 lifecycle은 400을 받는다", async () => {
    const { agent } = await loginAs("SYSTEM_ADMIN");
    await agent
      .get("/api/materials/boms?lifecycle=ARCHIVED")
      .set("Origin", allowedOrigin)
      .expect(400);
  });
});
