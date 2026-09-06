import type { LandingRoute, RoleCode } from "@/entities/session";

export const ROLE_START_TASKS: Record<
  RoleCode,
  {
    path: LandingRoute;
    title: string;
    steps: readonly [string, string, string];
  }
> = {
  PRODUCTION_PLANNER: {
    path: "/work-orders",
    title: "작업지시 한 건의 납기와 차단 사유부터 확인하세요",
    steps: [
      "번호·제품·계획수량을 읽습니다.",
      "납기·우선순위·차단 사유를 확인합니다.",
      "행을 열어 자재·공정·검사 기록을 대조합니다.",
    ],
  },
  MATERIAL_MANAGER: {
    path: "/materials/lots",
    title: "재고가 있는지보다 실제 사용할 수 있는지 확인하세요",
    steps: [
      "자재 코드와 LOT 번호를 확인합니다.",
      "재고·예약·가용 수량과 품질 상태를 구분합니다.",
      "상세에서 예약과 변경 이력을 대조합니다.",
    ],
  },
  SHOP_FLOOR_OPERATOR: {
    path: "/execution/queue",
    title: "지금 진행할 수 있는 공정과 차단 이유부터 확인하세요",
    steps: [
      "작업지시·생산 LOT·공정 순서를 읽습니다.",
      "준비 상태와 차단 사유를 확인합니다.",
      "상세를 읽은 뒤 실제 작업할 때만 시작·완료합니다.",
    ],
  },
  QUALITY_ENGINEER: {
    path: "/quality/inspections",
    title: "검사 대상과 실행 상태·판정을 나눠 확인하세요",
    steps: [
      "검사 번호·대상 LOT·공정을 대조합니다.",
      "검사 완료와 합격·보류·불합격을 구분합니다.",
      "상세에서 기준과 사유를 확인하고 판정은 신중히 실행합니다.",
    ],
  },
  SYSTEM_ADMIN: {
    path: "/dashboard",
    title: "전체 업무 흐름을 대시보드부터 확인하세요",
    steps: [
      "운영 현황과 조치가 필요한 항목을 확인합니다.",
      "작업지시부터 자재·공정·검사·계보로 이동합니다.",
      "전체 업무를 실행할 수 있으므로 저장 전 대상과 상태를 확인합니다.",
    ],
  },
};
