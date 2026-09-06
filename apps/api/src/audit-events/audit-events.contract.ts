import { AuditAction, RoleCode } from "../generated/prisma/enums.js";

export const AUDIT_ACTIONS = [
  "USER_ACCESS_CHANGED",
  "SESSION_LOGIN",
  "SESSION_LOGOUT",
  "WORK_ORDER_CREATED",
  "WORK_ORDER_RELEASED",
  "WORK_ORDER_CANCELLED",
  "MATERIAL_RESERVED",
  "MATERIAL_LOT_DISPOSITION_DECIDED",
  "INSPECTION_VERDICTED",
  "QUALITY_INCIDENT_REGISTERED",
] as const satisfies readonly AuditAction[];

export const AUDIT_ACTOR_ROLES = [
  "PRODUCTION_PLANNER",
  "MATERIAL_MANAGER",
  "SHOP_FLOOR_OPERATOR",
  "QUALITY_ENGINEER",
  "SYSTEM_ADMIN",
] as const satisfies readonly RoleCode[];

export const AUDIT_SORT_FIELDS = ["occurredAt", "entityId"] as const;

export type AuditSortField = (typeof AUDIT_SORT_FIELDS)[number];

export interface AuditEventListItem {
  id: string;
  occurredAt: string;
  actorId: string;
  actorRole: RoleCode;
  actorName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  requestId: string;
}

export interface AuditEventListResult {
  items: AuditEventListItem[];
  page: number;
  pageSize: number;
  total: number;
}
