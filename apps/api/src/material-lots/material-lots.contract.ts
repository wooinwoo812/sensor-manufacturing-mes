import { QualityDisposition } from "../generated/prisma/enums.js";

export const MATERIAL_LOT_DISPOSITIONS = [
  "PENDING",
  "ACCEPTED",
  "HOLD",
  "QUARANTINED",
  "REJECTED",
] as const satisfies readonly QualityDisposition[];

export const MATERIAL_LOT_AVAILABILITY_FILTERS = [
  "available",
  "shortage",
  "expired",
  "all",
] as const;

export type MaterialLotAvailabilityFilter =
  (typeof MATERIAL_LOT_AVAILABILITY_FILTERS)[number];

export const MATERIAL_LOT_SORT_FIELDS = [
  "lotNumber",
  "expiresAt",
  "receivedAt",
  "onHand",
] as const;

export type MaterialLotSortField = (typeof MATERIAL_LOT_SORT_FIELDS)[number];

export interface MaterialLotListItem {
  id: string;
  lotNumber: string;
  materialCode: string;
  materialName: string;
  unit: string;
  receivedQuantity: number;
  onHand: number;
  reservedQuantity: number;
  consumedQuantity: number;
  scrappedQuantity: number;
  availableQuantity: number;
  qualityDisposition: QualityDisposition;
  expiresAt: string | null;
  receivedAt: string;
}

export interface MaterialLotListResult {
  items: MaterialLotListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MaterialLotAllocationView {
  id: string;
  workOrderNumber: string;
  quantity: number;
  status: "ACTIVE" | "CLOSED";
  closedReason: string | null;
  createdAt: string;
}

export interface MaterialLotAuditView {
  id: string;
  occurredAt: string;
  actorName: string;
  actorRole: string;
  action: string;
  summary: string;
}

export interface MaterialLotDetail extends MaterialLotListItem {
  allocations: MaterialLotAllocationView[];
  recentAudits: MaterialLotAuditView[];
}
