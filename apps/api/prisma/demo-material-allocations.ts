/**
 * 데모 자재 예약(MaterialAllocation) seed.
 *
 * LOT별 수량 합계는 demo-material-lots.ts 의 reservedQuantity 와 같아야 한다.
 * (목록의 "예약" 열과 상세의 "예약 내역"이 같은 숫자를 보여주기 위함)
 */
export interface DemoMaterialAllocation {
  workOrderNumber: string;
  lotNumber: string;
  quantity: number;
}

export const DEMO_MATERIAL_ALLOCATIONS: DemoMaterialAllocation[] = [
  // ML-2026-0301 (적외선 감지 다이오드 어레이) reserved 120
  { workOrderNumber: "WO-2026-091", lotNumber: "ML-2026-0301", quantity: 120 },
  // ML-2026-0302 (적외선 감지 다이오드 어레이) reserved 300
  { workOrderNumber: "WO-2026-094", lotNumber: "ML-2026-0302", quantity: 160 },
  { workOrderNumber: "WO-2026-097", lotNumber: "ML-2026-0302", quantity: 110 },
  { workOrderNumber: "WO-2026-098", lotNumber: "ML-2026-0302", quantity: 30 },
  // ML-2026-0311 (세라믹 패키지) reserved 90
  { workOrderNumber: "WO-2026-094", lotNumber: "ML-2026-0311", quantity: 80 },
  { workOrderNumber: "WO-2026-098", lotNumber: "ML-2026-0311", quantity: 10 },
  // ML-2026-0321 (TE 쿨링 모듈) reserved 40
  { workOrderNumber: "WO-2026-091", lotNumber: "ML-2026-0321", quantity: 40 },
  // ML-2026-0331 (신호 커넥터) reserved 260
  { workOrderNumber: "WO-2026-091", lotNumber: "ML-2026-0331", quantity: 120 },
  { workOrderNumber: "WO-2026-094", lotNumber: "ML-2026-0331", quantity: 80 },
  { workOrderNumber: "WO-2026-097", lotNumber: "ML-2026-0331", quantity: 60 },
];
