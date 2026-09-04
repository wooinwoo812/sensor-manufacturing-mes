export const QUALITY_INCIDENT_STATUS_LABELS = {
  OPEN: "조사 중",
  ASSESSED: "영향 평가 완료",
  CONTAINED: "봉쇄 조치",
  CLOSED: "종결",
} as const;

export type QualityIncidentStatus = keyof typeof QUALITY_INCIDENT_STATUS_LABELS;

export const QUALITY_INCIDENT_SOURCE_TYPE_LABELS = {
  MATERIAL_LOT: "자재 LOT",
  PRODUCTION_LOT: "생산 LOT",
  FINISHED_UNIT: "완제품",
} as const;

export type QualityIncidentSourceType =
  keyof typeof QUALITY_INCIDENT_SOURCE_TYPE_LABELS;

export interface QualityIncidentListItem {
  id: string;
  incidentNumber: string;
  title: string;
  sourceType: QualityIncidentSourceType;
  sourceLotNumber: string;
  description: string | null;
  status: QualityIncidentStatus;
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface QualityIncidentListResult {
  items: QualityIncidentListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface QualityIncidentAuditView {
  id: string;
  action: string;
  actorName: string;
  summary: string;
  occurredAt: string;
}

export interface QualityIncidentDetail extends QualityIncidentListItem {
  audits: QualityIncidentAuditView[];
}
