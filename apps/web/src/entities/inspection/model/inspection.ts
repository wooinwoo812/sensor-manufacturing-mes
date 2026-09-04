export const INSPECTION_EXECUTION_STATUS_LABELS = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
} as const;

export type InspectionExecutionStatus = keyof typeof INSPECTION_EXECUTION_STATUS_LABELS;

export const INSPECTION_VERDICT_LABELS = {
  PASS: "합격",
  FAIL: "불합격",
  HOLD: "보류",
} as const;

export type InspectionVerdict = keyof typeof INSPECTION_VERDICT_LABELS;

export const INSPECTION_GATE_LABELS = {
  ROUTE_ADVANCE: "공정 진행",
  LOT_COMPLETE: "LOT 완료",
} as const;

export type InspectionGate = keyof typeof INSPECTION_GATE_LABELS;

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
