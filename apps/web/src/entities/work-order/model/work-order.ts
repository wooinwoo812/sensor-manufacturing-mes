export const WORK_ORDER_STATUS_LABELS = {
  DRAFT: "초안",
  RELEASED: "발행",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
} as const;

export type WorkOrderStatus = keyof typeof WORK_ORDER_STATUS_LABELS;

export const WORK_ORDER_STATUSES = Object.keys(
  WORK_ORDER_STATUS_LABELS,
) as readonly WorkOrderStatus[];

export type WorkOrderPriorityBadgeValue =
  "low" | "normal" | "high" | "critical";

const PRIORITY_BADGE_VALUES = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "critical",
} as const;

export type WorkOrderPriority = keyof typeof PRIORITY_BADGE_VALUES;

export const WORK_ORDER_PRIORITIES = Object.keys(
  PRIORITY_BADGE_VALUES,
) as readonly WorkOrderPriority[];

export const WORK_ORDER_PRIORITY_LABELS = {
  LOW: "낮음",
  NORMAL: "보통",
  HIGH: "높음",
  URGENT: "긴급",
} as const;

export const WORK_ORDER_DUE_OPTIONS = {
  all: "전체 납기",
  overdue: "납기 지연",
  today: "오늘 만료",
  "7d": "7일 이내",
} as const;

export type WorkOrderDueFilter = keyof typeof WORK_ORDER_DUE_OPTIONS;

export interface WorkOrderListItem {
  id: string;
  orderNumber: string;
  productCode: string;
  productName: string;
  plannedQuantity: number;
  unit: string;
  dueDate: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  progressPercent: number;
  currentStepName: string | null;
  blockedReason: string | null;
  memo: string | null;
}

export interface WorkOrderListResult {
  items: WorkOrderListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface WorkOrderStepView {
  id: string;
  sequence: number;
  processStepName: string;
  productionLotNumber: string;
  readiness: "WAITING" | "READY" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  blockedReasonCodes: readonly string[];
}

export interface WorkOrderInspectionView {
  id: string;
  inspectionNumber: string;
  processStepName: string;
  gate: "ROUTE_ADVANCE" | "LOT_COMPLETE";
  specName: string;
  executionStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  verdict: "PASS" | "FAIL" | "HOLD" | null;
}

export interface WorkOrderAuditView {
  id: string;
  occurredAt: string;
  actorName: string;
  actorRole: string;
  action: string;
  summary: string;
}

export interface WorkOrderDetail extends WorkOrderListItem {
  createdAt: string;
  steps: WorkOrderStepView[];
  inspections: WorkOrderInspectionView[];
  recentAudits: WorkOrderAuditView[];
  materialRequirements: { materialCode: string; materialName: string; requiredQuantity: number; unit: string }[];
}

export interface WorkOrderProduct {
  code: string;
  name: string;
  unit: string;
}

export const WORK_ORDER_READINESS_LABELS = {
  WAITING: "대기",
  READY: "실행 가능",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  BLOCKED: "차단",
} as const;

export const WORK_ORDER_GATE_LABELS = {
  ROUTE_ADVANCE: "공정 진행",
  LOT_COMPLETE: "LOT 완료",
} as const;

export const WORK_ORDER_EXECUTION_STATUS_LABELS = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
} as const;

export const WORK_ORDER_VERDICT_LABELS = {
  PASS: "합격",
  FAIL: "불합격",
  HOLD: "보류",
} as const;

export type WorkOrderVerdict = keyof typeof WORK_ORDER_VERDICT_LABELS;

export function toPriorityBadgeValue(
  priority: WorkOrderPriority,
): WorkOrderPriorityBadgeValue {
  return PRIORITY_BADGE_VALUES[priority];
}

export function formatWorkOrderDueDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDate));
}

export function isDueOverdue(isoDate: string, now = new Date()): boolean {
  const startOfToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(isoDate).getTime() < Date.parse(`${startOfToday}T00:00:00+09:00`);
}
