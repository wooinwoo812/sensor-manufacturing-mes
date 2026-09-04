export const TRACE_NODE_TYPES = [
  "MATERIAL_LOT",
  "PRODUCTION_LOT",
  "FINISHED_UNIT",
] as const;
export type TraceNodeType = (typeof TRACE_NODE_TYPES)[number];

export const LOT_RELATION_TYPES = [
  "CONSUME",
  "SPLIT",
  "MERGE",
  "TRANSFORM",
  "SERIALIZE",
] as const;
export type LotRelationType = (typeof LOT_RELATION_TYPES)[number];

export const TRACE_NODE_TYPE_LABELS: Record<TraceNodeType, string> = {
  MATERIAL_LOT: "자재 LOT",
  PRODUCTION_LOT: "생산 LOT",
  FINISHED_UNIT: "완제품 일련번호",
};

export const LOT_RELATION_TYPE_LABELS: Record<LotRelationType, string> = {
  CONSUME: "투입",
  SPLIT: "분할",
  MERGE: "병합",
  TRANSFORM: "변형",
  SERIALIZE: "시리얼화",
};

export interface TraceNodeListItem {
  id: string;
  nodeType: TraceNodeType;
  label: string;
  materialLotId: string | null;
  productionLotNumber: string | null;
  upstreamCount: number;
  downstreamCount: number;
  createdAt: string;
}

export interface TraceNodeListResult {
  items: TraceNodeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TraceEdgeView {
  id: string;
  relationType: LotRelationType;
  quantity: number;
  processStepExecutionId: string | null;
  createdAt: string;
  node: {
    id: string;
    nodeType: TraceNodeType;
    label: string;
  };
}

export interface TraceNodeDetail {
  id: string;
  nodeType: TraceNodeType;
  label: string;
  materialLotId: string | null;
  productionLotNumber: string | null;
  createdAt: string;
  upstream: TraceEdgeView[];
  downstream: TraceEdgeView[];
}
