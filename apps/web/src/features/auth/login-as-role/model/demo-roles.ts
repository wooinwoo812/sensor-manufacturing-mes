import type { RoleCode } from "@/entities/session";

export interface DemoRoleOption {
  code: RoleCode;
  email: string;
  label: string;
  description: string;
  landingLabel: string;
}

export interface LoginExperience {
  startGuide: boolean;
}

export type LoginReason = "required" | "session-expired" | "role-changed";

export const DEMO_PASSWORD = "SensorDemo!2026";

export const DEMO_ROLE_OPTIONS: readonly DemoRoleOption[] = [
  {
    code: "SYSTEM_ADMIN",
    email: "admin.demo@sensor-mes.local",
    label: "최고관리자",
    description: "전체 화면과 업무 실행·사용자 권한을 관리합니다.",
    landingLabel: "대시보드",
  },
  {
    code: "PRODUCTION_PLANNER",
    email: "planner.demo@sensor-mes.local",
    label: "생산계획 담당자",
    description: "작업지시를 만들고 생산 진행 상황을 확인합니다.",
    landingLabel: "작업지시",
  },
  {
    code: "SHOP_FLOOR_OPERATOR",
    email: "operator.demo@sensor-mes.local",
    label: "현장 작업자",
    description: "공정을 시작하고 양품·불량 수량을 기록합니다.",
    landingLabel: "공정 실행",
  },
  {
    code: "MATERIAL_MANAGER",
    email: "material.demo@sensor-mes.local",
    label: "자재 담당자",
    description: "자재 재고를 확인하고 작업에 필요한 수량을 예약합니다.",
    landingLabel: "자재 LOT",
  },
  {
    code: "QUALITY_ENGINEER",
    email: "quality.demo@sensor-mes.local",
    label: "품질 담당자",
    description: "검사 결과를 판정하고 보류 건을 검토합니다.",
    landingLabel: "품질검사",
  },
];
