import type { RoleCode } from "@/entities/session";

export interface DemoRoleOption {
  code: RoleCode;
  email: string;
  label: string;
  description: string;
  landingLabel: string;
}

export type LoginReason = "required" | "session-expired" | "role-changed";

export const DEMO_PASSWORD = "SensorDemo!2026";

export const DEMO_ROLE_OPTIONS: readonly DemoRoleOption[] = [
  {
    code: "PRODUCTION_PLANNER",
    email: "planner.demo@sensor-mes.local",
    label: "생산계획 담당자",
    description: "작업지시와 계획 대비 실적을 확인합니다.",
    landingLabel: "작업지시",
  },
  {
    code: "SHOP_FLOOR_OPERATOR",
    email: "operator.demo@sensor-mes.local",
    label: "현장 작업자",
    description: "생산 LOT의 공정 투입과 실적을 기록합니다.",
    landingLabel: "공정 실행",
  },
  {
    code: "MATERIAL_MANAGER",
    email: "material.demo@sensor-mes.local",
    label: "자재 담당자",
    description: "자재 LOT 가용량과 예약을 관리합니다.",
    landingLabel: "자재 LOT",
  },
  {
    code: "QUALITY_ENGINEER",
    email: "quality.demo@sensor-mes.local",
    label: "품질 담당자",
    description: "검사 판정과 부적합 영향을 관리합니다.",
    landingLabel: "품질검사",
  },
  {
    code: "SYSTEM_ADMIN",
    email: "admin.demo@sensor-mes.local",
    label: "시스템 관리자",
    description: "사용자 권한과 통합 감사이력을 확인합니다.",
    landingLabel: "감사이력",
  },
];
