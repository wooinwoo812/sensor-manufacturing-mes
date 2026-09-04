export interface DemoBomItem {
  materialCode: string;
  quantityPerProductBaseUom: string;
}

export interface DemoBomRevision {
  revisionNumber: string;
  productCode: string;
  productName: string;
  productBaseUom: string;
  description?: string;
  lifecycle: "DRAFT" | "PUBLISHED" | "INACTIVE";
  items: DemoBomItem[];
}

export const DEMO_PRODUCTS = [
  {
    code: "SEN-IR-640",
    name: "적외선 센서 모듈 640px",
    baseUom: "EA",
  },
  {
    code: "SEN-XR-1280",
    name: "X선 검출기 패널 1280px",
    baseUom: "EA",
  },
  {
    code: "SEN-IR-320-QC",
    name: "적외선 코어 320px QC 버전",
    baseUom: "EA",
  },
] as const;

export const DEMO_BOM_REVISIONS: DemoBomRevision[] = [
  {
    revisionNumber: "BOM-2026-R001",
    productCode: "SEN-IR-640",
    productName: "적외선 센서 모듈 640px",
    productBaseUom: "EA",
    description: "TE 쿨링 모듈 사양 반영 발행본",
    lifecycle: "PUBLISHED",
    items: [
      { materialCode: "SEN-MAT-014", quantityPerProductBaseUom: "2.000000" },
      { materialCode: "SEN-MAT-032", quantityPerProductBaseUom: "1.000000" },
      { materialCode: "SEN-MAT-045", quantityPerProductBaseUom: "4.000000" },
    ],
  },
  {
    revisionNumber: "BOM-2026-R002",
    productCode: "SEN-XR-1280",
    productName: "X선 검출기 패널 1280px",
    productBaseUom: "EA",
    lifecycle: "PUBLISHED",
    items: [
      { materialCode: "SEN-MAT-014", quantityPerProductBaseUom: "1.000000" },
      { materialCode: "SEN-MAT-021", quantityPerProductBaseUom: "2.500000" },
    ],
  },
  {
    revisionNumber: "BOM-2026-R003-DRAFT",
    productCode: "SEN-IR-640",
    productName: "적외선 센서 모듈 640px",
    productBaseUom: "EA",
    description: "케이블 강화 초안",
    lifecycle: "DRAFT",
    items: [
      { materialCode: "SEN-MAT-014", quantityPerProductBaseUom: "2.000000" },
      { materialCode: "SEN-MAT-032", quantityPerProductBaseUom: "1.000000" },
      { materialCode: "SEN-MAT-045", quantityPerProductBaseUom: "4.000000" },
      { materialCode: "SEN-MAT-021", quantityPerProductBaseUom: "1.000000" },
    ],
  },
  {
    revisionNumber: "BOM-2026-R004",
    productCode: "SEN-IR-320-QC",
    productName: "적외선 코어 320px QC 버전",
    productBaseUom: "EA",
    description: "QC 버전 전용 구성 — 소수 소요량 포함",
    lifecycle: "PUBLISHED",
    items: [
      { materialCode: "SEN-MAT-014", quantityPerProductBaseUom: "1.500000" },
      { materialCode: "SEN-MAT-032", quantityPerProductBaseUom: "2.000000" },
      { materialCode: "SEN-MAT-045", quantityPerProductBaseUom: "1.000000" },
    ],
  },
];
