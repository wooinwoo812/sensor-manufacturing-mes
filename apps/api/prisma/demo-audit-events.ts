import { DEMO_ACCOUNTS } from "../src/auth/demo-accounts.js";

const actorByRole = (role: string) => {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);
  if (account === undefined) {
    throw new Error(`데모 계정 없음: ${role}`);
  }
  return { actorId: account.id, actorName: account.displayName };
};

const hourOffset = (hours: number) => new Date(Date.now() - hours * 3_600_000);

export interface DemoAuditEvent {
  occurredAt: Date;
  actorId: string;
  actorRole: "PRODUCTION_PLANNER" | "MATERIAL_MANAGER" | "SHOP_FLOOR_OPERATOR" | "QUALITY_ENGINEER" | "SYSTEM_ADMIN";
  actorName: string;
  action:
    | "SESSION_LOGIN"
    | "SESSION_LOGOUT"
    | "WORK_ORDER_CREATED"
    | "WORK_ORDER_RELEASED"
    | "WORK_ORDER_CANCELLED"
    | "MATERIAL_RESERVED"
    | "MATERIAL_LOT_DISPOSITION_DECIDED"
    | "PROCESS_COMPLETED"
    | "INSPECTION_VERDICTED"
    | "QUALITY_INCIDENT_REGISTERED";
  entityType: "WORK_ORDER" | "MATERIAL_LOT" | "INSPECTION" | "QUALITY_INCIDENT" | "SESSION";
  entityId: string;
  summary: string;
  requestId: string;
}

export const DEMO_AUDIT_EVENTS: DemoAuditEvent[] = [
  {
    occurredAt: hourOffset(2),
    ...actorByRole("QUALITY_ENGINEER"),
    actorRole: "QUALITY_ENGINEER",
    action: "INSPECTION_VERDICTED",
    entityType: "INSPECTION",
    entityId: "INSP-2026-0107",
    summary: "조립 정밀도 검사 불합격 판정 (기준 초과 0.02mm)",
    requestId: "req-2026-09-03-0042",
  },
  {
    occurredAt: hourOffset(5),
    ...actorByRole("MATERIAL_MANAGER"),
    actorRole: "MATERIAL_MANAGER",
    action: "MATERIAL_LOT_DISPOSITION_DECIDED",
    entityType: "MATERIAL_LOT",
    entityId: "ML-2026-0323",
    summary: "TE 쿨링 모듈 LOT를 격리 처분 (선행 검사 보류)",
    requestId: "req-2026-09-03-0038",
  },
  {
    occurredAt: hourOffset(9),
    ...actorByRole("SHOP_FLOOR_OPERATOR"),
    actorRole: "SHOP_FLOOR_OPERATOR",
    action: "SESSION_LOGIN",
    entityType: "SESSION",
    entityId: "demo-shop-floor-operator",
    summary: "현장 작업자 데모 세션 로그인",
    requestId: "req-2026-09-03-0031",
  },
  {
    occurredAt: hourOffset(26),
    ...actorByRole("PRODUCTION_PLANNER"),
    actorRole: "PRODUCTION_PLANNER",
    action: "WORK_ORDER_RELEASED",
    entityType: "WORK_ORDER",
    entityId: "WO-2026-097",
    summary: "적외선 센서 모듈 100EA 작업지시 발행",
    requestId: "req-2026-09-02-0117",
  },
  {
    occurredAt: hourOffset(30),
    ...actorByRole("MATERIAL_MANAGER"),
    actorRole: "MATERIAL_MANAGER",
    action: "MATERIAL_RESERVED",
    entityType: "WORK_ORDER",
    entityId: "WO-2026-098",
    summary: "침담 공정 자재 요구에 다이오드 어레이 30EA 예약",
    requestId: "req-2026-09-02-0109",
  },
  {
    occurredAt: hourOffset(33),
    ...actorByRole("QUALITY_ENGINEER"),
    actorRole: "QUALITY_ENGINEER",
    action: "INSPECTION_VERDICTED",
    entityType: "INSPECTION",
    entityId: "INSP-2026-0104",
    summary: "침담 품질 검사 판정 보류 (재측정 요청)",
    requestId: "req-2026-09-02-0103",
  },
  {
    occurredAt: hourOffset(48),
    ...actorByRole("PRODUCTION_PLANNER"),
    actorRole: "PRODUCTION_PLANNER",
    action: "WORK_ORDER_CANCELLED",
    entityType: "WORK_ORDER",
    entityId: "WO-2026-096",
    summary: "계획 변경으로 작업지시 취소 (실적 없음 확인)",
    requestId: "req-2026-09-02-0091",
  },
  {
    occurredAt: hourOffset(52),
    ...actorByRole("PRODUCTION_PLANNER"),
    actorRole: "PRODUCTION_PLANNER",
    action: "WORK_ORDER_CREATED",
    entityType: "WORK_ORDER",
    entityId: "WO-2026-099",
    summary: "적외선 코어 250EA 초안 작업지시 생성",
    requestId: "req-2026-09-02-0084",
  },
  {
    occurredAt: hourOffset(55),
    ...actorByRole("SYSTEM_ADMIN"),
    actorRole: "SYSTEM_ADMIN",
    action: "SESSION_LOGIN",
    entityType: "SESSION",
    entityId: "demo-system-admin",
    summary: "시스템 관리자 데모 세션 로그인",
    requestId: "req-2026-09-02-0078",
  },
  {
    occurredAt: hourOffset(70),
    ...actorByRole("PRODUCTION_PLANNER"),
    actorRole: "PRODUCTION_PLANNER",
    action: "SESSION_LOGOUT",
    entityType: "SESSION",
    entityId: "demo-production-planner",
    summary: "생산계획 담당자 세션 종료",
    requestId: "req-2026-09-02-0061",
  },
];
