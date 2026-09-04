import {
  InspectionExecutionStatus,
  InspectionGate,
  InspectionVerdict,
} from "../generated/prisma/enums.js";

export const INSPECTION_EXECUTION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly InspectionExecutionStatus[];

export const INSPECTION_VERDICTS = [
  "PASS",
  "FAIL",
  "HOLD",
] as const satisfies readonly InspectionVerdict[];

export const INSPECTION_GATES = [
  "ROUTE_ADVANCE",
  "LOT_COMPLETE",
] as const satisfies readonly InspectionGate[];

export const INSPECTION_SORT_FIELDS = [
  "inspectionNumber",
  "createdAt",
  "completedAt",
] as const;

export type InspectionSortField = (typeof INSPECTION_SORT_FIELDS)[number];

export interface InspectionListItem {
  id: string;
  inspectionNumber: string;
  workOrderNumber: string;
  productCode: string;
  productName: string;
  productionLotNumber: string;
  processStepName: string;
  gate: InspectionGate;
  specName: string;
  executionStatus: InspectionExecutionStatus;
  verdict: InspectionVerdict | null;
  completedAt: string | null;
  createdAt: string;
}

export interface InspectionListResult {
  items: InspectionListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface InspectionAuditView {
  id: string;
  occurredAt: string;
  actorName: string;
  actorRole: string;
  action: string;
  summary: string;
}

export interface InspectionDetail extends InspectionListItem {
  verdictMemo: string | null;
  recentAudits: InspectionAuditView[];
}
