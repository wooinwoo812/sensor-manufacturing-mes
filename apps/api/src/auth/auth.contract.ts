import { RoleCode } from "../generated/prisma/enums.js";

export const Permission = {
  DASHBOARD_READ: "dashboard:read",
  WORK_ORDER_READ: "work-order:read",
  WORK_ORDER_CREATE: "work-order:create",
  WORK_ORDER_RELEASE: "work-order:release",
  WORK_ORDER_CANCEL: "work-order:cancel",
  MASTER_DATA_READ: "master-data:read",
  MATERIAL_LOT_READ: "material-lot:read",
  MATERIAL_LOT_DECIDE_QUALITY: "material-lot:decide-quality",
  MATERIAL_ALLOCATION_READ: "material-allocation:read",
  MATERIAL_ALLOCATION_CREATE: "material-allocation:create",
  MATERIAL_ALLOCATION_RELEASE: "material-allocation:release",
  PROCESS_EXECUTION_READ: "process-execution:read",
  PROCESS_EXECUTION_EXECUTE: "process-execution:execute",
  INSPECTION_READ: "inspection:read",
  INSPECTION_EXECUTE: "inspection:execute",
  INSPECTION_CORRECT: "inspection:correct",
  PRODUCTION_LOT_DECIDE_QUALITY: "production-lot:decide-quality",
  QUALITY_INCIDENT_READ: "quality-incident:read",
  QUALITY_INCIDENT_CREATE: "quality-incident:create",
  QUARANTINE_TARGET_DECIDE: "quarantine-target:decide",
  TRACE_READ: "trace:read",
  AUDIT_EVENT_READ: "audit-event:read",
  USER_MANAGE: "user:manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

interface RoleConfiguration {
  label: string;
  landingRoute: string;
  permissions: readonly Permission[];
}

const workOrderRead = [Permission.WORK_ORDER_READ] as const;
const materialReads = [
  Permission.MASTER_DATA_READ,
  Permission.MATERIAL_LOT_READ,
] as const;

export const ROLE_CONFIG: Record<RoleCode, RoleConfiguration> = {
  [RoleCode.PRODUCTION_PLANNER]: {
    label: "생산계획 담당자",
    landingRoute: "/work-orders",
    permissions: [
      Permission.DASHBOARD_READ,
      ...workOrderRead,
      Permission.WORK_ORDER_CREATE,
      Permission.WORK_ORDER_RELEASE,
      Permission.WORK_ORDER_CANCEL,
      ...materialReads,
      Permission.MATERIAL_ALLOCATION_READ,
      Permission.PROCESS_EXECUTION_READ,
      Permission.INSPECTION_READ,
      Permission.QUALITY_INCIDENT_READ,
      Permission.TRACE_READ,
    ],
  },
  [RoleCode.MATERIAL_MANAGER]: {
    label: "자재 담당자",
    landingRoute: "/materials/lots",
    permissions: [
      ...workOrderRead,
      ...materialReads,
      Permission.MATERIAL_ALLOCATION_READ,
      Permission.MATERIAL_ALLOCATION_CREATE,
      Permission.MATERIAL_ALLOCATION_RELEASE,
      Permission.QUALITY_INCIDENT_READ,
      Permission.TRACE_READ,
    ],
  },
  [RoleCode.SHOP_FLOOR_OPERATOR]: {
    label: "현장 작업자",
    landingRoute: "/execution/queue",
    permissions: [
      ...workOrderRead,
      Permission.PROCESS_EXECUTION_READ,
      Permission.PROCESS_EXECUTION_EXECUTE,
    ],
  },
  [RoleCode.QUALITY_ENGINEER]: {
    label: "품질 담당자",
    landingRoute: "/quality/inspections",
    permissions: [
      ...workOrderRead,
      ...materialReads,
      Permission.MATERIAL_LOT_DECIDE_QUALITY,
      Permission.PROCESS_EXECUTION_READ,
      Permission.INSPECTION_READ,
      Permission.INSPECTION_EXECUTE,
      Permission.INSPECTION_CORRECT,
      Permission.PRODUCTION_LOT_DECIDE_QUALITY,
      Permission.QUALITY_INCIDENT_READ,
      Permission.QUALITY_INCIDENT_CREATE,
      Permission.QUARANTINE_TARGET_DECIDE,
      Permission.TRACE_READ,
    ],
  },
  [RoleCode.SYSTEM_ADMIN]: {
    label: "시스템 관리자",
    landingRoute: "/audit-events",
    permissions: [
      Permission.DASHBOARD_READ,
      ...workOrderRead,
      ...materialReads,
      Permission.MATERIAL_ALLOCATION_READ,
      Permission.PROCESS_EXECUTION_READ,
      Permission.INSPECTION_READ,
      Permission.QUALITY_INCIDENT_READ,
      Permission.TRACE_READ,
      Permission.AUDIT_EVENT_READ,
      Permission.USER_MANAGE,
    ],
  },
};

export function hasPermissions(
  role: RoleCode,
  required: readonly Permission[],
) {
  const granted = new Set(ROLE_CONFIG[role].permissions);
  return required.every((permission) => granted.has(permission));
}
