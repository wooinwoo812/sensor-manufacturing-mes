export const PROCESS_READINESS_LABELS = {
  WAITING: "대기",
  READY: "실행 가능",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  BLOCKED: "차단",
} as const;

export type ProcessReadiness = keyof typeof PROCESS_READINESS_LABELS;

export const PROCESS_READINESS_FILTER_OPTIONS = {
  all: "전체 준비 상태",
  ready: "실행 가능",
  "in-progress": "진행 중",
  blocked: "차단",
  completed: "완료",
} as const;

export type ProcessReadinessFilterOption = keyof typeof PROCESS_READINESS_FILTER_OPTIONS;

export const BLOCKED_REASON_LABELS = {
  PREREQUISITE_INCOMPLETE: "선행 공정 미완료",
  INSPECTION_PENDING: "검사 대기",
  INSPECTION_FAILED: "검사 불합격",
  INSPECTION_HELD: "검사 보류",
  MATERIAL_SHORTAGE: "자재 부족",
  MATERIAL_QUARANTINED: "자재 격리",
  MATERIAL_EXPIRED: "자재 만료",
} as const;

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
