import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/database/prisma.service.js";
import { hashPassword } from "../src/auth/password.js";
import { ROLE_CONFIG } from "../src/auth/auth.contract.js";
import { AdminUsersService } from "../src/admin-users/admin-users.service.js";
import type { AuthenticatedSession } from "../src/auth/auth.http.js";
import type { RoleCode } from "../src/generated/prisma/enums.js";

const origin = "http://localhost:5173",
  password = "test-only-password";
let passwordHash: string;
type User = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  isActive: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: { roleCode: RoleCode }[];
};
type Session = {
  id: string;
  tokenHash: string;
  csrfToken: string;
  userId: string;
  activeRole: RoleCode;
  expiresAt: Date;
  revokedAt: Date | null;
};
type Audit = {
  id: string;
  occurredAt: Date;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  details: unknown;
};
// In-memory fixtures only: these tests never connect to the user's development DB.
class FakePrisma {
  users: User[] = Object.keys(ROLE_CONFIG).map((role, index) => ({
    id: "user-" + index,
    email: role.toLowerCase() + "@example.test",
    displayName: ROLE_CONFIG[role as RoleCode].label,
    passwordHash,
    isActive: true,
    isDemo: true,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    roles: [{ roleCode: role as RoleCode }],
  }));
  sessions: Session[] = [];
  events: Audit[] = [];
  sequence = 0;
  failAudit = false;
  private tail = Promise.resolve();
  user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
      this.users.find((user) =>
        where.id ? user.id === where.id : user.email === where.email,
      ) ?? null,
    findMany: async () => this.users,
    count: async ({ where }: { where: { id: { not: string } } }) =>
      this.users.filter(
        (user) =>
          user.id !== where.id.not &&
          user.isActive &&
          user.roles.some((role) => role.roleCode === "SYSTEM_ADMIN"),
      ).length,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { isActive: boolean; updatedAt: Date };
    }) => {
      const user = this.users.find((user) => user.id === where.id)!;
      Object.assign(user, data);
      return user;
    },
  };
  session = {
    create: async ({ data }: { data: Omit<Session, "id" | "revokedAt"> }) => {
      const row = {
        ...data,
        id: "session-" + ++this.sequence,
        revokedAt: null,
      };
      this.sessions.push(row);
      return row;
    },
    findUnique: async ({ where }: { where: { tokenHash: string } }) => {
      const session = this.sessions.find(
        (row) => row.tokenHash === where.tokenHash,
      );
      if (!session) return null;
      const user = this.users.find(
        (user) =>
          user.id === session.userId &&
          user.roles.some((role) => role.roleCode === session.activeRole),
      );
      return user ? { ...session, userRole: { user } } : null;
    },
    findFirst: async ({
      where,
    }: {
      where: { id: string; userId: string; expiresAt: { gt: Date } };
    }) =>
      this.sessions.find(
        (row) =>
          row.id === where.id &&
          row.userId === where.userId &&
          row.activeRole === "SYSTEM_ADMIN" &&
          row.revokedAt === null &&
          row.expiresAt > where.expiresAt.gt &&
          this.users.some(
            (user) =>
              user.id === row.userId &&
              user.isActive &&
              user.roles.some((role) => role.roleCode === "SYSTEM_ADMIN"),
          ),
      ) ?? null,
    updateMany: async ({
      where,
      data,
    }: {
      where: {
        id?: string;
        userId?: string;
        tokenHash?: string;
        revokedAt: null;
      };
      data: { revokedAt: Date };
    }) => {
      let count = 0;
      for (const row of this.sessions)
        if (
          row.revokedAt === null &&
          (!where.id || row.id === where.id) &&
          (!where.userId || row.userId === where.userId) &&
          (!where.tokenHash || row.tokenHash === where.tokenHash)
        ) {
          row.revokedAt = data.revokedAt;
          count++;
        }
      return { count };
    },
  };
  userRole = {
    deleteMany: async ({
      where,
    }: {
      where: { userId: string; roleCode: { not: RoleCode } };
    }) => {
      const user = this.users.find((user) => user.id === where.userId)!;
      user.roles = user.roles.filter(
        (role) => role.roleCode === where.roleCode.not,
      );
      return { count: 1 };
    },
    upsert: async ({
      create,
    }: {
      create: { userId: string; roleCode: RoleCode };
    }) => {
      const user = this.users.find((user) => user.id === create.userId)!;
      if (!user.roles.some((role) => role.roleCode === create.roleCode))
        user.roles.push({ roleCode: create.roleCode });
      return create;
    },
  };
  auditEvent = {
    create: async ({ data }: { data: Omit<Audit, "id"> }) => {
      if (this.failAudit) throw Error("audit unavailable");
      const row = { ...data, id: "audit-" + ++this.sequence };
      this.events.push(row);
      return row;
    },
    count: async ({ where }: { where: { entityId: string } }) =>
      this.events.filter((event) => event.entityId === where.entityId).length,
    findMany: async ({
      where,
      skip,
      take,
    }: {
      where: { entityId: string };
      skip: number;
      take: number;
    }) =>
      this.events
        .filter((event) => event.entityId === where.entityId)
        .toReversed()
        .slice(skip, skip + take),
  };
  async $executeRawUnsafe(sql: string) {
    expect(sql).toBe("SELECT pg_advisory_xact_lock(20260906, 1)");
    return 1;
  }
  async $transaction<T>(run: (tx: this) => Promise<T>) {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    const snapshot = structuredClone({
      users: this.users,
      sessions: this.sessions,
      events: this.events,
    });
    try {
      return await run(this);
    } catch (error) {
      Object.assign(this, snapshot);
      throw error;
    } finally {
      release();
    }
  }
  async $disconnect() {}
}

describe("user access administration", () => {
  let app: INestApplication, prisma: FakePrisma;
  beforeAll(async () => {
    passwordHash = await hashPassword(password, "access-tests");
  });
  beforeEach(async () => {
    prisma = new FakePrisma();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });
  async function login(role: RoleCode) {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({ email: role + "@example.test", password })
      .expect(200);
    return {
      cookie: response.headers["set-cookie"] as unknown as string[],
      csrf: response.body.csrfToken as string,
      userId: response.body.user.id as string,
    };
  }
  const target = () =>
    prisma.users.find(
      (user) => user.roles[0]?.roleCode === "PRODUCTION_PLANNER",
    )!;
  function body(user = target()) {
    return {
      roleCode: "MATERIAL_MANAGER",
      isActive: true,
      reason: "업무 담당 변경",
      expectedUpdatedAt: user.updatedAt.toISOString(),
    };
  }
  function save(
    auth: Awaited<ReturnType<typeof login>>,
    id = target().id,
    value: Record<string, unknown> = body(),
  ) {
    return request(app.getHttpServer())
      .patch("/api/admin/users/" + id + "/access")
      .set("Origin", origin)
      .set("Cookie", auth.cookie)
      .set("X-CSRF-Token", auth.csrf)
      .send(value);
  }
  it("requires an administrator for catalog, history and changes", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/users/roles")
      .expect(401);
    for (const role of [
      "PRODUCTION_PLANNER",
      "MATERIAL_MANAGER",
      "SHOP_FLOOR_OPERATOR",
      "QUALITY_ENGINEER",
    ] as RoleCode[]) {
      const auth = await login(role);
      await request(app.getHttpServer())
        .get("/api/admin/users/roles")
        .set("Cookie", auth.cookie)
        .expect(403);
      await request(app.getHttpServer())
        .get("/api/admin/users/" + target().id + "/access-history")
        .set("Cookie", auth.cookie)
        .expect(403);
      await save(auth).expect(403);
    }
    expect(prisma.events).toHaveLength(0);
  });
  it("returns a read-only five-role catalog and exposes future permissions honestly", async () => {
    const auth = await login("SYSTEM_ADMIN");
    const response = await request(app.getHttpServer())
      .get("/api/admin/users/roles")
      .set("Cookie", auth.cookie)
      .expect(200);
    expect(response.body.roles).toHaveLength(5);
    expect(
      response.body.permissions.filter(
        (p: { implemented: boolean }) => !p.implemented,
      ),
    ).toHaveLength(3);
    expect(
      response.body.roles.find(
        (r: { code: string }) => r.code === "SYSTEM_ADMIN",
      ).permissions,
    ).toEqual(
      expect.arrayContaining([
        "work-order:create",
        "process-execution:execute",
        "inspection:execute",
        "user:manage",
      ]),
    );
  });
  it("requires CSRF and same origin for a mutation", async () => {
    const auth = await login("SYSTEM_ADMIN"),
      url = "/api/admin/users/" + target().id + "/access";
    await request(app.getHttpServer())
      .patch(url)
      .set("Cookie", auth.cookie)
      .set("Origin", origin)
      .send(body())
      .expect(403);
    await request(app.getHttpServer())
      .patch(url)
      .set("Cookie", auth.cookie)
      .set("Origin", "https://untrusted.test")
      .set("X-CSRF-Token", auth.csrf)
      .send(body())
      .expect(403);
    expect(prisma.events).toHaveLength(0);
  });
  it.each([
    { roleCode: "ROOT" },
    { reason: " " },
    { reason: "a".repeat(201) },
    { isActive: "false" },
    { expectedUpdatedAt: "bad" },
    { permissions: ["*"] },
  ])("rejects invalid or unsupported change %j", async (invalid) => {
    await save(await login("SYSTEM_ADMIN"), target().id, {
      ...body(),
      ...invalid,
    }).expect(400);
    expect(prisma.events).toHaveLength(0);
  });
  it("changes one role, revokes every target session and records before/after/reason", async () => {
    const oldA = await login("PRODUCTION_PLANNER"),
      oldB = await login("PRODUCTION_PLANNER"),
      admin = await login("SYSTEM_ADMIN"),
      id = target().id;
    const response = await save(admin, id).expect(200);
    expect(response.body.user.roles).toEqual([
      { code: "MATERIAL_MANAGER", label: "자재 담당자" },
    ]);
    expect(response.body.sessionRevoked).toBe(false);
    for (const auth of [oldA, oldB])
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Cookie", auth.cookie)
        .expect(401);
    const history = await request(app.getHttpServer())
      .get("/api/admin/users/" + id + "/access-history")
      .set("Cookie", admin.cookie)
      .expect(200);
    expect(history.body.total).toBe(1);
    expect(history.body.items[0].details).toEqual({
      before: { roles: ["PRODUCTION_PLANNER"], isActive: true },
      after: { roles: ["MATERIAL_MANAGER"], isActive: true },
      reason: "업무 담당 변경",
    });
    expect(JSON.stringify(history.body)).not.toMatch(
      /passwordHash|tokenHash|csrfToken/,
    );
    const fresh = await login("PRODUCTION_PLANNER");
    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", fresh.cookie)
      .expect(200);
    expect(me.body.activeRole.code).toBe("MATERIAL_MANAGER");
  });
  it("disables login as well as already issued sessions", async () => {
    const old = await login("PRODUCTION_PLANNER"),
      admin = await login("SYSTEM_ADMIN");
    await save(admin, target().id, {
      ...body(),
      roleCode: "PRODUCTION_PLANNER",
      isActive: false,
    }).expect(200);
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", old.cookie)
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({ email: "PRODUCTION_PLANNER@example.test", password })
      .expect(401);
  });
  it.each([{ roleCode: "MATERIAL_MANAGER" }, { isActive: false }])(
    "protects the last active administrator %j",
    async (change) => {
      const admin = await login("SYSTEM_ADMIN"),
        user = prisma.users.find((user) => user.id === admin.userId)!;
      const response = await save(admin, user.id, {
        ...body(user),
        roleCode: "SYSTEM_ADMIN",
        ...change,
      }).expect(409);
      expect(response.body.code).toBe("LAST_ACTIVE_ADMIN");
      expect(prisma.events).toHaveLength(0);
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Cookie", admin.cookie)
        .expect(200);
    },
  );
  it("allows self-demotion when another active administrator exists and forces re-login", async () => {
    prisma.users.find(
      (user) => user.roles[0]?.roleCode === "MATERIAL_MANAGER",
    )!.roles = [{ roleCode: "SYSTEM_ADMIN" }];
    const admin = await login("SYSTEM_ADMIN"),
      user = prisma.users.find((user) => user.id === admin.userId)!;
    const result = await save(admin, user.id, body(user)).expect(200);
    expect(result.body.sessionRevoked).toBe(true);
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", admin.cookie)
      .expect(401);
  });
  it("does not revoke or audit an unchanged save", async () => {
    const old = await login("PRODUCTION_PLANNER"),
      admin = await login("SYSTEM_ADMIN");
    const response = await save(admin, target().id, {
      ...body(),
      roleCode: "PRODUCTION_PLANNER",
    }).expect(200);
    expect(response.body.changed).toBe(false);
    expect(prisma.events).toHaveLength(0);
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", old.cookie)
      .expect(200);
  });
  it("rejects stale updates, missing users and invalid history pagination", async () => {
    const admin = await login("SYSTEM_ADMIN");
    await save(admin, target().id, {
      ...body(),
      expectedUpdatedAt: "2025-01-01T00:00:00.000Z",
    }).expect(409);
    await save(admin, "missing", body()).expect(404);
    await request(app.getHttpServer())
      .get("/api/admin/users/" + target().id + "/access-history?pageSize=3")
      .set("Cookie", admin.cookie)
      .expect(400);
  });
  it("rolls back state and revocations if audit persistence fails", async () => {
    const admin = await login("SYSTEM_ADMIN"),
      old = await login("PRODUCTION_PLANNER"),
      snapshot = structuredClone(prisma.users);
    prisma.failAudit = true;
    await save(admin).expect(500);
    expect(prisma.users).toEqual(snapshot);
    expect(prisma.events).toHaveLength(0);
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", old.cookie)
      .expect(200);
  });
  it("keeps one active administrator when two self-demotions are submitted through the serialized fixture", async () => {
    const second = prisma.users.find(
      (user) => user.roles[0]?.roleCode === "MATERIAL_MANAGER",
    )!;
    second.roles = [{ roleCode: "SYSTEM_ADMIN" }];
    const firstAuth = await login("SYSTEM_ADMIN"),
      secondAuth = await login("MATERIAL_MANAGER");
    const first = prisma.users.find((user) => user.id === firstAuth.userId)!;
    const responses = await Promise.all([
      save(firstAuth, first.id, body(first)),
      save(secondAuth, second.id, body(second)),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      prisma.users.filter(
        (user) =>
          user.isActive &&
          user.roles.some((role) => role.roleCode === "SYSTEM_ADMIN"),
      ),
    ).toHaveLength(1);
    expect(prisma.events).toHaveLength(1);
  });
  it("returns a conflict without retrying a serialization failure", async () => {
    const admin = await login("SYSTEM_ADMIN");
    const transaction = vi
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce({ code: "P2034" });
    const response = await save(admin).expect(409);
    expect(response.body.code).toBe("USER_ACCESS_CONFLICT");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(prisma.events).toHaveLength(0);
  });
  it("rechecks the acting administrator session inside the transaction", async () => {
    const admin = await login("SYSTEM_ADMIN"),
      session = prisma.sessions.find(
        (session) => session.userId === admin.userId,
      )!;
    session.revokedAt = new Date();
    const service = app.get(AdminUsersService);
    const actor = {
      sessionId: session.id,
      userId: admin.userId,
      activeRole: "SYSTEM_ADMIN",
      displayName: "관리자",
    } as AuthenticatedSession;
    await expect(
      service.changeAccess(target().id, body(), actor),
    ).rejects.toMatchObject({ status: 401 });
    expect(prisma.events).toHaveLength(0);
  });
});
