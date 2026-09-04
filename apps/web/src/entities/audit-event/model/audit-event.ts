export const AUDIT_ACTION_LABELS = {
  SESSION_LOGIN: "세션 로그인",
  SESSION_LOGOUT: "세션 종료",
  WORK_ORDER_CREATED: "작업지시 생성",
  WORK_ORDER_RELEASED: "작업지시 발행",
  WORK_ORDER_CANCELLED: "작업지시 취소",
  MATERIAL_RESERVED: "자재 예약",
  MATERIAL_LOT_DISPOSITION_DECIDED: "자재 품질 처분",
  INSPECTION_VERDICTED: "검사 판정",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTION_LABELS;

export const AUDIT_ENTITY_TYPE_LABELS = {
  WORK_ORDER: "작업지시",
  MATERIAL_LOT: "자재 LOT",
  INSPECTION: "검사",
  SESSION: "세션",
} as const;

export const AUDIT_ACTOR_ROLE_OPTIONS = {
  PRODUCTION_PLANNER: "생산계획 담당자",
  MATERIAL_MANAGER: "자재 담당자",
  SHOP_FLOOR_OPERATOR: "현장 작업자",
  QUALITY_ENGINEER: "품질 담당자",
  SYSTEM_ADMIN: "시스템 관리자",
} as const;

export type AuditActorRole = keyof typeof AUDIT_ACTOR_ROLE_OPTIONS;

export interface AuditEventListItem {
  id: string;
  occurredAt: string;
  actorId: string;
  actorRole: AuditActorRole;
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

export function formatAuditDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}
