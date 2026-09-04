import { DEMO_ACCOUNTS } from "../src/auth/demo-accounts.js";
import { DEMO_MATERIAL_ALLOCATIONS } from "./demo-material-allocations.js";
import { DEMO_MATERIAL_LOTS } from "./demo-material-lots.js";
import { DEMO_WORK_ORDERS } from "./demo-work-orders.js";
import { DEMO_INSPECTIONS } from "./demo-inspections.js";
import type { DemoAuditEvent } from "./demo-audit-events.js";

/**
 * 상세 화면의 "변경 이력"이 비어 보이지 않도록 작업지시·자재 LOT마다 생성되는
 * 배경 이력이다. 감사이력 화면 e2e 테스트는 curated 목록(DEMO_AUDIT_EVENTS)만
 * 기준으로 하므로 이 배열은 seed 에서만 이어 붙인다.
 */

const actorByRole = (role: DemoAuditEvent["actorRole"]) => {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);
  if (account === undefined) {
    throw new Error(`데모 계정 없음: ${role}`);
  }
  return { actorId: account.id, actorRole: role, actorName: account.displayName };
};

const hourOffset = (hours: number) => new Date(Date.now() - hours * 3_600_000);

const requestId = (prefix: string, index: number) =>
  `req-2026-08-${String(20 + (index % 9)).padStart(2, "0")}-${prefix}${String(index + 1).padStart(3, "0")}`;

function workOrderHistory(): DemoAuditEvent[] {
  const events: DemoAuditEvent[] = [];
  DEMO_WORK_ORDERS.forEach((order, index) => {
    // 오래된 순서: 뒤 번호일수록 최근. curated 목록(48~70시간 전)보다 더 과거에 둔다.
    const baseHours = 96 + (DEMO_WORK_ORDERS.length - index) * 6;
    events.push({
      occurredAt: hourOffset(baseHours),
      ...actorByRole("PRODUCTION_PLANNER"),
      action: "WORK_ORDER_CREATED",
      entityType: "WORK_ORDER",
      entityId: order.orderNumber,
      summary: `${order.productName} ${order.plannedQuantity.toLocaleString("ko-KR")}${order.unit} 초안 작업지시 생성`,
      requestId: requestId("wc", index),
    });
    if (order.status === "RELEASED" || order.status === "IN_PROGRESS" || order.status === "COMPLETED") {
      events.push({
        occurredAt: hourOffset(baseHours - 3),
        ...actorByRole("PRODUCTION_PLANNER"),
        action: "WORK_ORDER_RELEASED",
        entityType: "WORK_ORDER",
        entityId: order.orderNumber,
        summary: `${order.orderNumber} 발행 (납기 ${order.dueDate.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })})`,
        requestId: requestId("wr", index),
      });
    }
    if (order.status === "COMPLETED") {
      events.push({
        occurredAt: hourOffset(baseHours - 20),
        ...actorByRole("SHOP_FLOOR_OPERATOR"),
        action: "PROCESS_COMPLETED",
        entityType: "WORK_ORDER",
        entityId: order.orderNumber,
        summary: `${order.orderNumber} 마지막 공정 완료, 출하 대기`,
        requestId: requestId("pc", index),
      });
    }
  });
  return events;
}

function materialLotHistory(): DemoAuditEvent[] {
  const events: DemoAuditEvent[] = [];
  DEMO_MATERIAL_ALLOCATIONS.forEach((allocation, index) => {
    events.push({
      occurredAt: hourOffset(80 + index * 2),
      ...actorByRole("MATERIAL_MANAGER"),
      action: "MATERIAL_RESERVED",
      entityType: "MATERIAL_LOT",
      entityId: allocation.lotNumber,
      summary: `${allocation.workOrderNumber}에 ${allocation.lotNumber} ${allocation.quantity.toLocaleString("ko-KR")}EA 예약`,
      requestId: requestId("mr", index),
    });
  });
  DEMO_MATERIAL_LOTS.forEach((lot, index) => {
    if (lot.qualityDisposition === "HOLD" || lot.qualityDisposition === "REJECTED") {
      const label = lot.qualityDisposition === "HOLD" ? "보류" : "거부";
      events.push({
        occurredAt: hourOffset(60 + index * 2),
        ...actorByRole("QUALITY_ENGINEER"),
        action: "MATERIAL_LOT_DISPOSITION_DECIDED",
        entityType: "MATERIAL_LOT",
        entityId: lot.lotNumber,
        summary: `${lot.lotNumber} 품질 ${label} 처분 (수입검사 결과 반영)`,
        requestId: requestId("md", index),
      });
    }
  });
  return events;
}

function inspectionHistory(): DemoAuditEvent[] {
  const verdictLabel = { PASS: "합격", FAIL: "불합격", HOLD: "보류" } as const;
  // curated 목록이 이미 다루는 검사(0104 보류, 0107 불합격)는 중복 기록하지 않는다.
  const curated = new Set(["INSP-2026-0104", "INSP-2026-0107"]);
  return DEMO_INSPECTIONS.filter(
    (inspection) =>
      inspection.executionStatus === "COMPLETED" &&
      inspection.verdict !== null &&
      !curated.has(inspection.inspectionNumber),
  ).map((inspection, index) => ({
    occurredAt: inspection.completedAt ?? hourOffset(40 + index * 3),
    ...actorByRole("QUALITY_ENGINEER"),
    action: "INSPECTION_VERDICTED",
    entityType: "INSPECTION",
    entityId: inspection.inspectionNumber,
    summary: `${inspection.specName} ${verdictLabel[inspection.verdict as keyof typeof verdictLabel]} 판정 (${inspection.productionLotNumber})`,
    requestId: requestId("iv", index),
  }));
}

export const DEMO_AUDIT_HISTORY: DemoAuditEvent[] = [
  ...workOrderHistory(),
  ...materialLotHistory(),
  ...inspectionHistory(),
];
