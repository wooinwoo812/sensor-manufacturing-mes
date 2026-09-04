import { ProcessReadiness } from "../generated/prisma/enums.js";

export const PROCESS_READINESS_VALUES = [
  "WAITING",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
] as const satisfies readonly ProcessReadiness[];

export const PROCESS_READINESS_FILTERS = [
  "ready",
  "in-progress",
  "blocked",
  "completed",
  "all",
] as const;

export type ProcessReadinessFilter = (typeof PROCESS_READINESS_FILTERS)[number];

export const PROCESS_READINESS_BY_FILTER = {
  ready: "READY",
  "in-progress": "IN_PROGRESS",
  blocked: "BLOCKED",
  completed: "COMPLETED",
} as const satisfies Record<
  Exclude<ProcessReadinessFilter, "all">,
  ProcessReadiness
>;

export const PROCESS_EXECUTION_SORT_FIELDS = [
  "orderNumber",
  "sequence",
  "productionLotNumber",
] as const;

export type ProcessExecutionSortField =
  (typeof PROCESS_EXECUTION_SORT_FIELDS)[number];

export interface ProcessExecutionListItem {
  id: string;
  workOrderNumber: string;
  productCode: string;
  productName: string;
  plannedQuantity: number;
  unit: string;
  dueDate: string;
  sequence: number;
  processStepName: string;
  productionLotNumber: string;
  readiness: ProcessReadiness;
  blockedReasonCodes: readonly string[];
}

export interface ProcessExecutionListResult {
  items: ProcessExecutionListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProcessStepInspectionView {
  id: string;
  inspectionNumber: string;
  gate: string;
  executionStatus: string;
  verdict: string | null;
}

export interface ProcessExecutionDetail {
  id: string;
  workOrderNumber: string;
  productCode: string;
  productName: string;
  plannedQuantity: number;
  unit: string;
  dueDate: string;
  sequence: number;
  processStepName: string;
  productionLotNumber: string;
  readiness: ProcessReadiness;
  blockedReasonCodes: readonly string[];
  startedAt: string | null;
  completedAt: string | null;
  goodQuantity: number | null;
  defectQuantity: number | null;
  executionMemo: string | null;
  inspections: ProcessStepInspectionView[];
}
