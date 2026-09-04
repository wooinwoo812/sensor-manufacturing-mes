import { ApiRequestError } from "@/shared/api";

export const ROLE_CODES = [
  "PRODUCTION_PLANNER",
  "MATERIAL_MANAGER",
  "SHOP_FLOOR_OPERATOR",
  "QUALITY_ENGINEER",
  "SYSTEM_ADMIN",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const LANDING_ROUTES = [
  "/work-orders",
  "/materials/lots",
  "/execution/queue",
  "/quality/inspections",
  "/audit-events",
] as const;

export type LandingRoute = (typeof LANDING_ROUTES)[number];

export interface Session {
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
  landingRoute: LandingRoute;
  expiresAt: string;
  csrfToken: string;
}

export function parseSessionResponse(value: unknown): Session {
  if (typeof value !== "object" || value === null) {
    throw invalidSessionResponse();
  }

  const candidate = value as Record<string, unknown>;
  const user = asRecord(candidate.user);
  const activeRole = asRecord(candidate.activeRole);
  const roleCode = activeRole?.code;
  const landingRoute = candidate.landingRoute;
  const permissions = candidate.permissions;
  const expiresAt = candidate.expiresAt;
  const csrfToken = candidate.csrfToken;

  if (
    user === undefined ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.displayName !== "string" ||
    activeRole === undefined ||
    !isIncluded(ROLE_CODES, roleCode) ||
    typeof activeRole.label !== "string" ||
    !isIncluded(LANDING_ROUTES, landingRoute) ||
    !Array.isArray(permissions) ||
    !permissions.every((permission) => typeof permission === "string") ||
    typeof expiresAt !== "string" ||
    Number.isNaN(Date.parse(expiresAt)) ||
    typeof csrfToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(csrfToken)
  ) {
    throw invalidSessionResponse();
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    activeRole: { code: roleCode, label: activeRole.label },
    permissions,
    landingRoute,
    expiresAt,
    csrfToken,
  };
}

export function sessionHasPermission(session: Session, permission: string) {
  return session.permissions.includes(permission);
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function isIncluded<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" && values.includes(value as Values[number]);
}

function invalidSessionResponse() {
  return new ApiRequestError(
    502,
    "INVALID_SESSION_RESPONSE",
    "서버가 올바른 세션 정보를 반환하지 않았습니다.",
  );
}
