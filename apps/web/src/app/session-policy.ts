import { redirect } from "@tanstack/react-router";
import {
  sessionHasPermission,
  type LandingRoute,
  type Session,
} from "@/entities/session";
import type { LoginReason } from "@/features/auth/login-as-role";

export const RoutePermission = {
  DASHBOARD_READ: "dashboard:read",
  WORK_ORDER_READ: "work-order:read",
  WORK_ORDER_CREATE: "work-order:create",
  WORK_ORDER_RELEASE: "work-order:release",
  WORK_ORDER_CANCEL: "work-order:cancel",
  MATERIAL_LOT_READ: "material-lot:read",
  MASTER_DATA_READ: "master-data:read",
  PROCESS_EXECUTION_READ: "process-execution:read",
  INSPECTION_READ: "inspection:read",
  QUALITY_INCIDENT_READ: "quality-incident:read",
  TRACE_READ: "trace:read",
  AUDIT_EVENT_READ: "audit-event:read",
  USER_MANAGE: "user:manage",
} as const;

const implementedRoutePermission: Record<string, string> = {
  "/dashboard": RoutePermission.DASHBOARD_READ,
  "/work-orders": RoutePermission.WORK_ORDER_READ,
  "/work-orders/new": RoutePermission.WORK_ORDER_CREATE,
  "/work-orders/$workOrderId": RoutePermission.WORK_ORDER_READ,
  "/work-orders/$workOrderId/material-reservations":
    RoutePermission.WORK_ORDER_READ,
  "/materials/lots": RoutePermission.MATERIAL_LOT_READ,
  "/materials/boms": RoutePermission.MASTER_DATA_READ,
  "/execution/queue": RoutePermission.PROCESS_EXECUTION_READ,
  "/execution/lots/$productionLotId/steps/$processStepRevisionId":
    RoutePermission.PROCESS_EXECUTION_READ,
  "/quality/inspections": RoutePermission.INSPECTION_READ,
  "/quality/incidents": RoutePermission.QUALITY_INCIDENT_READ,
  "/quality/incidents/$qualityIncidentId":
    RoutePermission.QUALITY_INCIDENT_READ,
  "/traceability": RoutePermission.TRACE_READ,
  "/traceability/$traceNodeId": RoutePermission.TRACE_READ,
  "/audit-events": RoutePermission.AUDIT_EVENT_READ,
  "/admin/users": RoutePermission.USER_MANAGE,
};

export function resolvePostLoginPath(session: Session, requestedPath?: string) {
  const path =
    requestedPath === undefined ? undefined : readInternalPath(requestedPath);
  if (path === undefined) {
    return session.landingRoute;
  }

  const pathname = new URL(path, "https://sensor-mes.local").pathname;
  // Static guidance is readable by every authenticated role; business guards are unchanged.
  if (pathname === "/guide") return path;
  const permission = implementedRoutePermission[pathname];
  return permission !== undefined && sessionHasPermission(session, permission)
    ? path
    : session.landingRoute;
}

export function requireRoutePermission(
  session: Session,
  permission: string,
  from: string,
) {
  if (!sessionHasPermission(session, permission)) {
    throw redirect({
      to: "/forbidden",
      search: { from: readInternalPath(from) ?? session.landingRoute },
      replace: true,
    });
  }
}

export function readLoginSearch(search: Record<string, unknown>) {
  const redirectPath =
    typeof search.redirect === "string"
      ? readInternalPath(search.redirect)
      : undefined;
  const reason = isLoginReason(search.reason) ? search.reason : undefined;

  return {
    ...(redirectPath === undefined ? {} : { redirect: redirectPath }),
    ...(reason === undefined ? {} : { reason }),
  };
}

export function readForbiddenSearch(search: Record<string, unknown>) {
  const from =
    typeof search.from === "string" ? readInternalPath(search.from) : undefined;
  return from === undefined ? {} : { from };
}

export function roleLandingLabel(route: LandingRoute) {
  const labels: Record<LandingRoute, string> = {
    "/dashboard": "대시보드",
    "/work-orders": "작업지시",
    "/materials/lots": "자재 LOT",
    "/execution/queue": "공정 실행",
    "/quality/inspections": "품질검사",
    "/audit-events": "감사이력",
  };
  return labels[route];
}

function readInternalPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }

  try {
    const parsed = new URL(value, "https://sensor-mes.local");
    return parsed.origin === "https://sensor-mes.local"
      ? `${parsed.pathname}${parsed.search}`
      : undefined;
  } catch {
    return undefined;
  }
}

function isLoginReason(value: unknown): value is LoginReason {
  return (
    value === "required" ||
    value === "session-expired" ||
    value === "role-changed"
  );
}
