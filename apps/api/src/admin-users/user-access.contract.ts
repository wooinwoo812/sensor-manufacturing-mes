import { BadRequestException } from "@nestjs/common";
import { Permission, ROLE_CONFIG } from "../auth/auth.contract.js";
import type { RoleCode } from "../generated/prisma/enums.js";

export function parseAccessChange(value: unknown) {
  const bad = () =>
    new BadRequestException({
      code: "INVALID_USER_ACCESS",
      message: "역할·사용 상태·변경 사유와 최신 조회 버전을 확인해 주세요.",
    });
  if (!value || typeof value !== "object" || Array.isArray(value)) throw bad();
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (key) =>
        !["roleCode", "isActive", "reason", "expectedUpdatedAt"].includes(key),
    )
  )
    throw bad();
  if (
    typeof input.roleCode !== "string" ||
    !Object.hasOwn(ROLE_CONFIG, input.roleCode) ||
    typeof input.isActive !== "boolean" ||
    typeof input.reason !== "string" ||
    !input.reason.trim() ||
    input.reason.trim().length > 200 ||
    typeof input.expectedUpdatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(input.expectedUpdatedAt) ||
    !Number.isFinite(Date.parse(input.expectedUpdatedAt))
  )
    throw bad();
  return {
    roleCode: input.roleCode as RoleCode,
    isActive: input.isActive,
    reason: input.reason.trim(),
    expectedUpdatedAt: input.expectedUpdatedAt,
  };
}
export function parseHistoryQuery(query: Record<string, unknown>) {
  const page = query.page === undefined ? 1 : Number(query.page),
    pageSize = query.pageSize === undefined ? 10 : Number(query.pageSize);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100_000 ||
    ![10, 20, 50, 100].includes(pageSize) ||
    Array.isArray(query.page) ||
    Array.isArray(query.pageSize)
  )
    throw new BadRequestException({
      code: "INVALID_USER_HISTORY_QUERY",
      message: "페이지와 표시 건수를 확인해 주세요.",
    });
  return { page, pageSize };
}

const labels: Record<Permission, string> = {
  "dashboard:read": "대시보드 조회",
  "work-order:read": "작업지시 조회",
  "work-order:create": "작업지시 생성",
  "work-order:release": "작업지시 발행",
  "work-order:cancel": "작업지시 취소",
  "master-data:read": "BOM 기준정보 조회",
  "material-lot:read": "자재 LOT 조회",
  "material-lot:decide-quality": "자재 품질 판정",
  "material-allocation:read": "자재 예약 조회",
  "material-allocation:create": "자재 예약",
  "material-allocation:release": "자재 예약 해제",
  "process-execution:read": "공정 실행 조회",
  "process-execution:execute": "공정 시작·완료",
  "inspection:read": "검사 조회",
  "inspection:execute": "검사 판정",
  "inspection:correct": "검사 정정",
  "production-lot:decide-quality": "생산 LOT 품질 판정",
  "quality-incident:read": "부적합 조회",
  "quality-incident:create": "부적합 등록",
  "quarantine-target:decide": "격리 대상 판정",
  "trace:read": "LOT 계보 조회",
  "audit-event:read": "감사이력 조회",
  "user:manage": "사용자 역할·상태 관리",
};
const planned: readonly Permission[] = [
  Permission.INSPECTION_CORRECT,
  Permission.PRODUCTION_LOT_DECIDE_QUALITY,
  Permission.QUARANTINE_TARGET_DECIDE,
];
export function roleCatalog() {
  return {
    roles: Object.entries(ROLE_CONFIG).map(([code, role]) => ({
      code,
      label: role.label,
      landingRoute: role.landingRoute,
      permissions: role.permissions,
    })),
    permissions: Object.values(Permission).map((code) => ({
      code,
      label: labels[code],
      implemented: !planned.includes(code),
    })),
  };
}
