import { WorkOrderPriority, WorkOrderStatus } from "../generated/prisma/enums.js";

export const WORK_ORDER_STATUSES = [
  "DRAFT",
  "RELEASED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly WorkOrderStatus[];

export const WORK_ORDER_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const satisfies readonly WorkOrderPriority[];

export const WORK_ORDER_DUE_FILTERS = [
  "overdue",
  "today",
  "7d",
  "all",
] as const;

export type WorkOrderDueFilter = (typeof WORK_ORDER_DUE_FILTERS)[number];

export const WORK_ORDER_SORT_FIELDS = [
  "dueDate",
  "orderNumber",
  "progressPercent",
  "plannedQuantity",
] as const;

export type WorkOrderSortField = (typeof WORK_ORDER_SORT_FIELDS)[number];

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

export interface WorkOrderInspectionRequirementView {
  id: string;
  inspectionSpecRevisionId: string;
  specName: string;
  gate: "ROUTE_ADVANCE" | "LOT_COMPLETE";
  processStepName: string | null;
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
  inspectionRequirements: WorkOrderInspectionRequirementView[];
  recentAudits: WorkOrderAuditView[];
}

export interface WorkOrderCreateInput {
  productCode: string;
  plannedQuantity: number;
  dueDate: string;
  priority: WorkOrderPriority;
  memo?: string;
}
