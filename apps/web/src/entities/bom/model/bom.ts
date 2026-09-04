export const BOM_LIFECYCLES = ["DRAFT", "PUBLISHED", "INACTIVE"] as const;
export type BomLifecycle = (typeof BOM_LIFECYCLES)[number];

export const BOM_LIFECYCLE_LABELS: Record<BomLifecycle, string> = {
  DRAFT: "초안",
  PUBLISHED: "발행",
  INACTIVE: "비활성",
};

export interface BomItemView {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialUnit: string;
  quantityPerProductBaseUom: string;
}

export interface BomRevisionListItem {
  id: string;
  revisionNumber: string;
  productId: string;
  productCode: string;
  productName: string;
  productBaseUom: string;
  lifecycle: BomLifecycle;
  description: string | null;
  items: BomItemView[];
  createdAt: string;
}

export interface BomRevisionListResult {
  items: BomRevisionListItem[];
  total: number;
  page: number;
  pageSize: number;
}
