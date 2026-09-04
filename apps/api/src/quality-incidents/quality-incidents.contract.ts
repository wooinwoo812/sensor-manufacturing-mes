import {
  QualityIncidentSourceType,
  QualityIncidentStatus,
} from "../generated/prisma/enums.js";

export const QUALITY_INCIDENT_STATUSES = [
  "OPEN",
  "ASSESSED",
  "CONTAINED",
  "CLOSED",
] as const satisfies readonly QualityIncidentStatus[];

export const QUALITY_INCIDENT_SOURCE_TYPES = [
  "MATERIAL_LOT",
  "PRODUCTION_LOT",
  "FINISHED_UNIT",
] as const satisfies readonly QualityIncidentSourceType[];

export const QUALITY_INCIDENT_SORT_FIELDS = [
  "detectedAt",
  "incidentNumber",
] as const;

export type QualityIncidentSortField =
  (typeof QUALITY_INCIDENT_SORT_FIELDS)[number];

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
