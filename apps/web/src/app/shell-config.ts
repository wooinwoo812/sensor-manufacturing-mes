import type {
  AppShellConfiguration,
  AppShellProps,
} from "@/widgets/app-shell";

const navigation: AppShellProps["navigation"] = [
  {
    label: "운영",
    items: [{ label: "대시보드", to: "/dashboard", icon: "dashboard" }],
  },
  {
    label: "생산",
    items: [
      { label: "작업지시", icon: "work-order", pending: true },
      { label: "공정 실행", icon: "execution", pending: true },
    ],
  },
  {
    label: "자재",
    items: [
      { label: "BOM 기준정보", icon: "bom", pending: true },
      { label: "자재 LOT", icon: "material", pending: true },
    ],
  },
  {
    label: "품질",
    items: [
      { label: "검사", icon: "inspection", pending: true },
      { label: "부적합·격리", icon: "incident", pending: true },
    ],
  },
  {
    label: "추적",
    items: [{ label: "LOT 계보", icon: "trace", pending: true }],
  },
  {
    label: "관리",
    items: [
      { label: "감사이력", icon: "audit", pending: true },
      { label: "사용자", icon: "users", pending: true },
    ],
  },
];

const routeTitles: Record<string, { title: string }> = {
  "/dashboard": { title: "운영 대시보드" },
  "/dev/ui-kit": { title: "UI 시스템 점검" },
  "/forbidden": { title: "접근 권한 없음" },
};

export function resolveShellContext(pathname: string): AppShellConfiguration {
  const current = routeTitles[pathname] ?? { title: "화면을 찾을 수 없음" };

  return {
    navigation,
    pathname,
    pageTitle: current.title,
    currentRole: "시스템 관리자",
  };
}
