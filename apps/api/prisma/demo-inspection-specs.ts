export interface DemoInspectionSpecRevision {
  revisionNumber: string;
  productCode: string;
  specName: string;
  gate: "ROUTE_ADVANCE" | "LOT_COMPLETE";
  processStepName?: string;
  description?: string;
  lifecycle: "DRAFT" | "PUBLISHED" | "INACTIVE";
}

export const DEMO_INSPECTION_SPEC_REVISIONS: DemoInspectionSpecRevision[] = [
  {
    revisionNumber: "ISP-2026-R101",
    productCode: "SEN-IR-640",
    specName: "조립 정밀도 검사 규격 v2",
    gate: "ROUTE_ADVANCE",
    processStepName: "조립 2공정",
    description: "조립 2공정 통과 기준 — 정밀도 ±0.05mm",
    lifecycle: "PUBLISHED",
  },
  {
    revisionNumber: "ISP-2026-R102",
    productCode: "SEN-IR-640",
    specName: "적외선 모듈 최종검사 규격 v3",
    gate: "LOT_COMPLETE",
    description: "LOT 완료 기준 — 감도·온도 드리프트",
    lifecycle: "PUBLISHED",
  },
  {
    revisionNumber: "ISP-2026-R103",
    productCode: "SEN-IR-640",
    specName: "방수 등급 검사 규격 v1",
    gate: "ROUTE_ADVANCE",
    processStepName: "조립 2공정",
    description: "IP67 방수 등급 초안",
    lifecycle: "DRAFT",
  },
  {
    revisionNumber: "ISP-2026-R201",
    productCode: "SEN-XR-1280",
    specName: "절단 치수 검사 규격 v2",
    gate: "ROUTE_ADVANCE",
    processStepName: "절단 1공정",
    lifecycle: "PUBLISHED",
  },
  {
    revisionNumber: "ISP-2026-R202",
    productCode: "SEN-XR-1280",
    specName: "침담 품질 검사 규격 v1",
    gate: "ROUTE_ADVANCE",
    processStepName: "침담 공정",
    lifecycle: "PUBLISHED",
  },
  {
    revisionNumber: "ISP-2026-R203",
    productCode: "SEN-XR-1280",
    specName: "X선 패널 최종검사 규격 v4",
    gate: "LOT_COMPLETE",
    lifecycle: "PUBLISHED",
  },
  {
    revisionNumber: "ISP-2026-R301",
    productCode: "SEN-IR-320-QC",
    specName: "적외선 코어 광학축 검사 규격 v1",
    gate: "ROUTE_ADVANCE",
    processStepName: "코어 조립",
    lifecycle: "PUBLISHED",
  },
  {
    revisionNumber: "ISP-2026-R302",
    productCode: "SEN-IR-320-QC",
    specName: "코어 최종검사 규격 v1",
    gate: "LOT_COMPLETE",
    lifecycle: "PUBLISHED",
  },
];
