import { createHash, randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { RoleCode } from "../generated/prisma/enums.js";
import { PrismaService } from "../database/prisma.service.js";
import { ROLE_CONFIG } from "./auth.contract.js";
import type { AuthenticatedSession, HttpRequest } from "./auth.http.js";
import { verifyPassword } from "./password.js";

const sessionDurationMs = 8 * 60 * 60 * 1000;
const sessionTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const invalidCredentialsHash =
  "scrypt-v1$dummy-enumeration$PRicaQ34X85FCXM2t4CGaZTKvvKv_YsT6O2eGJZuuQSCxY96RyTYxF2DHI3dsVNoESVSjPZbE03LT4Xwlm_ahg";

export interface LoginInput {
  email: string;
  password: string;
}

export interface SessionResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  activeRole: {
    code: RoleCode;
    label: string;
  };
  permissions: readonly string[];
  landingRoute: string;
  expiresAt: string;
  csrfToken: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(input: unknown, currentSessionToken?: string) {
    const { email, password } = parseLoginInput(input);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { orderBy: { roleCode: "asc" } } },
    });
    const passwordMatches = await verifyPassword(
      password,
      user?.passwordHash ?? invalidCredentialsHash,
    );
    const assignedRole = user?.roles[0]?.roleCode;

    if (
      !passwordMatches ||
      user === null ||
      !user.isActive ||
      assignedRole === undefined
    ) {
      throw invalidCredentials();
    }

    const rawToken = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    const session = await this.prisma.$transaction(async (transaction) => {
      if (currentSessionToken !== undefined) {
        await transaction.session.updateMany({
          where: { tokenHash: hashToken(currentSessionToken), revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return transaction.session.create({
        data: {
          tokenHash: hashToken(rawToken),
          csrfToken,
          userId: user.id,
          activeRole: assignedRole,
          expiresAt,
        },
      });
    });

    return {
      rawToken,
      response: toSessionResponse({
        sessionId: session.id,
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        activeRole: assignedRole,
        csrfToken,
        expiresAt,
      }),
    };
  }

  async authenticateRequest(request: HttpRequest) {
    if (request.auth !== undefined) {
      return request.auth;
    }

    const rawToken = readSessionToken(request);
    if (rawToken === undefined) {
      throw sessionRequired();
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: {
        userRole: {
          include: { user: true },
        },
      },
    });

    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.userRole.user.isActive
    ) {
      throw sessionExpired();
    }

    const principal: AuthenticatedSession = {
      sessionId: session.id,
      userId: session.userId,
      email: session.userRole.user.email,
      displayName: session.userRole.user.displayName,
      activeRole: session.activeRole,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };
    request.auth = principal;
    return principal;
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  toResponse(principal: AuthenticatedSession) {
    return toSessionResponse(principal);
  }
}

export function sessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-mes_session"
    : "mes_session";
}

export function serializeSessionCookie(rawToken: string, clear = false) {
  const attributes = [
    `${sessionCookieName()}=${clear ? "" : rawToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }
  if (clear) {
    attributes.push("Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  }

  return attributes.join("; ");
}

export function readSessionToken(request: HttpRequest) {
  const cookieHeader = request.headers.cookie;
  const rawCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  if (rawCookie === undefined) {
    return undefined;
  }

  const prefix = `${sessionCookieName()}=`;
  const value = rawCookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);

  return value !== undefined && sessionTokenPattern.test(value) ? value : undefined;
}

function parseLoginInput(input: unknown): LoginInput {
  if (typeof input !== "object" || input === null) {
    throw invalidCredentials();
  }

  const candidate = input as Record<string, unknown>;
  const email =
    typeof candidate.email === "string" ? candidate.email.trim().toLowerCase() : "";
  const password = typeof candidate.password === "string" ? candidate.password : "";

  if (
    email.length < 3 ||
    email.length > 254 ||
    !email.includes("@") ||
    password.length < 1 ||
    password.length > 256
  ) {
    throw invalidCredentials();
  }

  return { email, password };
}

function toSessionResponse(principal: AuthenticatedSession): SessionResponse {
  const role = ROLE_CONFIG[principal.activeRole];
  return {
    user: {
      id: principal.userId,
      email: principal.email,
      displayName: principal.displayName,
    },
    activeRole: { code: principal.activeRole, label: role.label },
    permissions: role.permissions,
    landingRoute: role.landingRoute,
    expiresAt: principal.expiresAt.toISOString(),
    csrfToken: principal.csrfToken,
  };
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function invalidCredentials() {
  return new UnauthorizedException({
    code: "INVALID_CREDENTIALS",
    message: "이메일 또는 비밀번호를 확인하세요.",
  });
}

function sessionRequired() {
  return new UnauthorizedException({
    code: "SESSION_REQUIRED",
    message: "로그인이 필요하거나 세션이 만료되었습니다.",
  });
}

function sessionExpired() {
  return new UnauthorizedException({
    code: "SESSION_EXPIRED",
    message: "세션이 만료되었습니다. 다시 로그인해 주세요.",
  });
}
