const seoulStartOfToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return Date.parse(`${parts}T00:00:00+09:00`);
};

export { DEMO_PRODUCTS, type DemoProduct } from "../src/work-orders/work-order-products.js";

const dayOffset = (days: number, hour = 17) =>
  new Date(seoulStartOfToday() + days * 86_400_000 + hour * 3_600_000);

export interface DemoWorkOrder {
  orderNumber: string;
  productCode: string;
  productName: string;
  plannedQuantity: number;
  unit: string;
  dueDate: Date;
  status: "DRAFT" | "RELEASED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  progressPercent: number;
  currentStepName: string | null;
  blockedReason: string | null;
}

export const DEMO_WORK_ORDERS: DemoWorkOrder[] = [
  {
    orderNumber: "WO-2026-091",
    productCode: "SEN-IR-640",
    productName: "적외선 센서 모듈 640px",
    plannedQuantity: 120,
    unit: "EA",
    dueDate: dayOffset(2),
    status: "IN_PROGRESS",
    priority: "HIGH",
    progressPercent: 0,
    currentStepName: "조립 2공정",
    blockedReason: null,
  },
  {
    orderNumber: "WO-2026-092",
    productCode: "SEN-XR-1280",
    productName: "X선 검출기 패널 1280px",
    plannedQuantity: 40,
    unit: "EA",
    dueDate: dayOffset(-1),
    status: "RELEASED",
    priority: "URGENT",
    progressPercent: 0,
    currentStepName: "라인 투입 대기",
    blockedReason: "자재 LOT 부족 (SEN-MAT-014)",
  },
  {
    orderNumber: "WO-2026-093",
    productCode: "SEN-IR-320-QC",
    productName: "적외선 코어 320px QC 버전",
    plannedQuantity: 200,
    unit: "EA",
    dueDate: dayOffset(9),
    status: "DRAFT",
    priority: "NORMAL",
    progressPercent: 0,
    currentStepName: null,
    blockedReason: null,
  },
  {
    orderNumber: "WO-2026-094",
    productCode: "SEN-IR-640",
    productName: "적외선 센서 모듈 640px",
    plannedQuantity: 80,
    unit: "EA",
    dueDate: dayOffset(0, 12),
    status: "IN_PROGRESS",
    priority: "NORMAL",
    progressPercent: 50,
    currentStepName: "최종 검사",
    blockedReason: "조립 2공정 검사 불합격",
  },
  {
    orderNumber: "WO-2026-095",
    productCode: "SEN-XR-1280",
    productName: "X선 검출기 패널 1280px",
    plannedQuantity: 60,
    unit: "EA",
    dueDate: dayOffset(-3),
    status: "COMPLETED",
    priority: "HIGH",
    progressPercent: 100,
    currentStepName: null,
    blockedReason: null,
  },
  {
    orderNumber: "WO-2026-096",
    productCode: "SEN-IR-320-QC",
    productName: "적외선 코어 320px QC 버전",
    plannedQuantity: 150,
    unit: "EA",
    dueDate: dayOffset(5),
    status: "CANCELLED",
    priority: "LOW",
    progressPercent: 0,
    currentStepName: null,
    blockedReason: null,
  },
  {
    orderNumber: "WO-2026-097",
    productCode: "SEN-IR-640",
    productName: "적외선 센서 모듈 640px",
    plannedQuantity: 100,
    unit: "EA",
    dueDate: dayOffset(6),
    status: "RELEASED",
    priority: "HIGH",
    progressPercent: 0,
    currentStepName: "라인 투입 대기",
    blockedReason: null,
  },
  {
    orderNumber: "WO-2026-098",
    productCode: "SEN-XR-1280",
    productName: "X선 검출기 패널 1280px",
    plannedQuantity: 30,
    unit: "EA",
    dueDate: dayOffset(1),
    status: "IN_PROGRESS",
    priority: "NORMAL",
    progressPercent: 0,
    currentStepName: "침담 공정",
    blockedReason: "선행 검사 판정 보류",
  },
  {
    orderNumber: "WO-2026-099",
    productCode: "SEN-IR-320-QC",
    productName: "적외선 코어 320px QC 버전",
    plannedQuantity: 250,
    unit: "EA",
    dueDate: dayOffset(4),
    status: "DRAFT",
    priority: "URGENT",
    progressPercent: 0,
    currentStepName: null,
    blockedReason: null,
  },
];
