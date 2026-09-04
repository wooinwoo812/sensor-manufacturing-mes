export const MATERIAL_LOT_DISPOSITION_LABELS = {
  PENDING: "검사 대기",
  ACCEPTED: "허입",
  HOLD: "보류",
  QUARANTINED: "격리",
  REJECTED: "거부",
} as const;

export type MaterialLotDisposition = keyof typeof MATERIAL_LOT_DISPOSITION_LABELS;

export const MATERIAL_LOT_DISPOSITIONS = Object.keys(
  MATERIAL_LOT_DISPOSITION_LABELS,
) as readonly MaterialLotDisposition[];

export const MATERIAL_LOT_AVAILABILITY_OPTIONS = {
  all: "전체 가용성",
  available: "가용 있음",
  shortage: "가용 부족",
  expired: "만료",
} as const;

export type MaterialLotAvailability = keyof typeof MATERIAL_LOT_AVAILABILITY_OPTIONS;

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
  qualityDisposition: MaterialLotDisposition;
  expiresAt: string | null;
  receivedAt: string;
}

export interface MaterialLotListResult {
  items: MaterialLotListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export function formatMaterialLotDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDate));
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const target = new Date(isoDate).getTime();
  return Math.ceil((target - now.getTime()) / 86_400_000);
}
