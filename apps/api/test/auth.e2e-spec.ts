import {
  Controller,
  type INestApplication,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
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
import { Permission, ROLE_CONFIG } from "../src/auth/auth.contract.js";
import {
  CsrfGuard,
  PermissionGuard,
  RequirePermissions,
} from "../src/auth/auth.guards.js";
import type { HttpRequest } from "../src/auth/auth.http.js";
import { AuthModule } from "../src/auth/auth.module.js";
import { serializeSessionCookie } from "../src/auth/auth.service.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/auth/demo-accounts.js";
import { hashPassword } from "../src/auth/password.js";
import { PrismaService } from "../src/database/prisma.service.js";
import type { RoleCode } from "../src/generated/prisma/enums.js";

const allowedOrigin = "http://localhost:5173";
let passwordHash: string;

@Controller("test/commands")
class TestCommandController {
  @Post("execute-process")
  @UseGuards(PermissionGuard, CsrfGuard)
  @RequirePermissions(Permission.PROCESS_EXECUTION_EXECUTE)
  executeProcess(@Req() request: HttpRequest) {
    return { actorId: request.auth?.userId };
  }
}

interface FakeUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  isActive: boolean;
  roles: { roleCode: RoleCode }[];
}

interface FakeSession {
  id: string;
  tokenHash: string;
  csrfToken: string;
  userId: string;
  activeRole: RoleCode;
  expiresAt: Date;
  revokedAt: Date | null;
}

class FakePrismaService {
  private sequence = 0;
  readonly users: FakeUser[];
  readonly sessions: FakeSession[] = [];

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
    create: async ({ data }: { data: Omit<FakeSession, "id" | "revokedAt"> }) => {
      const session: FakeSession = {
        ...data,
        id: `session-${++this.sequence}`,
        revokedAt: null,
      };
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
    updateMany: async ({
      where,
      data,
    }: {
      where: { id?: string; tokenHash?: string; revokedAt: null };
      data: { revokedAt: Date };
    }) => {
      let count = 0;
      for (const session of this.sessions) {
        const matchesId = where.id === undefined || session.id === where.id;
        const matchesToken =
          where.tokenHash === undefined || session.tokenHash === where.tokenHash;
        if (matchesId && matchesToken && session.revokedAt === null) {
          session.revokedAt = data.revokedAt;
          count += 1;
        }
      }
      return { count };
    },
  };

  async $transaction<T>(callback: (transaction: this) => Promise<T>) {
    return callback(this);
  }

  async $disconnect() {}
}

describe("demo authentication and RBAC", () => {
  let app: INestApplication;
  let prisma: FakePrismaService;

  beforeAll(async () => {
    passwordHash = await hashPassword(DEMO_PASSWORD, "auth-e2e-test-salt");
  });

  beforeEach(async () => {
    process.env.WEB_ORIGIN = allowedOrigin;
    process.env.NODE_ENV = "test";
    prisma = new FakePrismaService();

    const testingModule = await Test.createTestingModule({
      imports: [AppModule, AuthModule],
      controllers: [TestCommandController],
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

  it("다섯 seed 역할과 권한표가 일치한다", () => {
    expect(DEMO_ACCOUNTS).toHaveLength(5);
    expect(new Set(DEMO_ACCOUNTS.map((account) => account.role))).toEqual(
      new Set(Object.keys(ROLE_CONFIG)),
    );
    expect(ROLE_CONFIG.SYSTEM_ADMIN.permissions).not.toContain(
      Permission.PROCESS_EXECUTION_EXECUTE,
    );
  });

  it("유효한 계정에 보안 cookie와 서버 session을 발급한다", async () => {
    const account = DEMO_ACCOUNTS[0];
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account.email, password: DEMO_PASSWORD })
      .expect(200);

    const setCookie = login.headers["set-cookie"] as unknown as string[];
    expect(setCookie[0]).toMatch(/^mes_session=[A-Za-z0-9_-]{43};/);
    expect(setCookie[0]).toContain("Path=/");
    expect(setCookie[0]).toContain("HttpOnly");
    expect(setCookie[0]).toContain("SameSite=Lax");
    expect(setCookie[0]).not.toContain("Secure");
    expect(login.body).toMatchObject({
      user: { id: account.id, email: account.email },
      activeRole: { code: account.role },
      landingRoute: ROLE_CONFIG[account.role].landingRoute,
    });
    expect(login.body).not.toHaveProperty("password");
    expect(login.body).not.toHaveProperty("sessionToken");

    await agent.get("/api/auth/me").expect(200).expect({
      ...login.body,
    });
  });

  it("없는 계정과 틀린 비밀번호를 같은 오류로 응답한다", async () => {
    const unknown = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: "unknown@sensor-mes.local", password: "wrong" })
      .expect(401);
    const wrongPassword = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: DEMO_ACCOUNTS[0].email, password: "wrong" })
      .expect(401);

    expect(unknown.body).toEqual(wrongPassword.body);
    expect(unknown.body).toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("누락되거나 허용되지 않은 origin을 session 생성 전에 거부한다", async () => {
    const account = DEMO_ACCOUNTS[0];
    const input = { email: account.email, password: DEMO_PASSWORD };

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send(input)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("ORIGIN_REJECTED"));
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Origin", "https://attacker.example")
      .send(input)
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("ORIGIN_REJECTED"));

    expect(prisma.sessions).toHaveLength(0);
  });

  it("인증된 상태 변경에 session-bound CSRF token을 요구한다", async () => {
    const account = DEMO_ACCOUNTS.find(
      (candidate) => candidate.role === "SHOP_FLOOR_OPERATOR",
    );
    expect(account).toBeDefined();
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account?.email, password: DEMO_PASSWORD })
      .expect(200);

    await agent
      .post("/api/test/commands/execute-process")
      .set("Origin", allowedOrigin)
      .send({})
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));
    await agent
      .post("/api/test/commands/execute-process")
      .set("Origin", allowedOrigin)
      .set("X-CSRF-Token", "wrong-token")
      .send({})
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe("CSRF_REJECTED"));

    await agent
      .post("/api/test/commands/execute-process")
      .set("Origin", allowedOrigin)
      .set("X-CSRF-Token", login.body.csrfToken as string)
      .send({ actorId: "client-forged-actor" })
      .expect(201)
      .expect({ actorId: account?.id });
  });

  it.each(DEMO_ACCOUNTS)(
    "$role command permission을 API에서 강제한다",
    async (account) => {
      const agent = request.agent(app.getHttpServer());
      const login = await agent
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: account.email, password: DEMO_PASSWORD })
        .expect(200);
      const expectedStatus =
        account.role === "SHOP_FLOOR_OPERATOR" ? 201 : 403;

      const response = await agent
        .post("/api/test/commands/execute-process")
        .set("Origin", allowedOrigin)
        .set("X-CSRF-Token", login.body.csrfToken as string)
        .send({})
        .expect(expectedStatus);

      if (expectedStatus === 403) {
        expect(response.body.code).toBe("PERMISSION_DENIED");
      }
    },
  );

  it("logout은 session을 폐기하고 cookie를 제거한다", async () => {
    const account = DEMO_ACCOUNTS[4];
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account.email, password: DEMO_PASSWORD })
      .expect(200);
    const logout = await agent
      .post("/api/auth/logout")
      .set("Origin", allowedOrigin)
      .set("X-CSRF-Token", login.body.csrfToken as string)
      .send({})
      .expect(200)
      .expect({ ok: true });

    const setCookie = logout.headers["set-cookie"] as unknown as string[];
    expect(setCookie[0]).toContain("Max-Age=0");
    await agent
      .get("/api/auth/me")
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_REQUIRED"));
  });

  it("만료 session과 권한 부족을 401과 403으로 구분한다", async () => {
    const account = DEMO_ACCOUNTS[0];
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post("/api/auth/login")
      .set("Origin", allowedOrigin)
      .send({ email: account.email, password: DEMO_PASSWORD })
      .expect(200);

    await agent
      .post("/api/test/commands/execute-process")
      .set("Origin", allowedOrigin)
      .set("X-CSRF-Token", login.body.csrfToken as string)
      .send({})
      .expect(403);

    const session = prisma.sessions.at(-1);
    expect(session).toBeDefined();
    if (session !== undefined) {
      session.expiresAt = new Date(0);
    }
    await agent
      .get("/api/auth/me")
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe("SESSION_EXPIRED"));
  });

  it("credentialed CORS header를 발급하지 않는다", async () => {
    const response = await request(app.getHttpServer())
      .options("/api/auth/login")
      .set("Origin", "https://attacker.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("production cookie는 __Host prefix와 Secure를 강제한다", () => {
    process.env.NODE_ENV = "production";
    expect(serializeSessionCookie("token")).toBe(
      "__Host-mes_session=token; Path=/; HttpOnly; SameSite=Lax; Secure",
    );
  });
});
