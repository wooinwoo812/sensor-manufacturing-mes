import { createHash, timingSafeEqual } from "node:crypto";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface HttpRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  auth?: AuthenticatedSession;
}

export interface HttpResponse {
  setHeader(name: string, value: string | readonly string[]): void;
}

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  activeRole: import("../generated/prisma/enums.js").RoleCode;
  csrfToken: string;
  expiresAt: Date;
}

export function headerValue(request: HttpRequest, name: string) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function isUnsafeMethod(method: string) {
  return unsafeMethods.has(method.toUpperCase());
}

export function assertJsonRequest(request: HttpRequest) {
  const contentType = headerValue(request, "content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw new BadRequestException({
      code: "JSON_REQUIRED",
      message: "JSON 요청만 사용할 수 있습니다.",
    });
  }
}

export function assertAllowedOrigin(request: HttpRequest) {
  if (!isUnsafeMethod(request.method)) {
    return;
  }

  const configuredOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
  const source = headerValue(request, "origin") ?? headerValue(request, "referer");

  if (source === undefined || readOrigin(source) !== readOrigin(configuredOrigin)) {
    throw new ForbiddenException({
      code: "ORIGIN_REJECTED",
      message: "요청 출처를 확인할 수 없습니다.",
    });
  }
}

export function safeTokenEqual(actual: string | undefined, expected: string) {
  if (actual === undefined) {
    return false;
  }

  const actualHash = createHash("sha256").update(actual).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

function readOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}
