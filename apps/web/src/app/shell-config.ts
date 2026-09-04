import type {
  AppShellConfiguration,
  AppShellProps,
} from "@/widgets/app-shell";
import { sessionHasPermission, type Session } from "@/entities/session";

type NavigationItem = AppShellProps["navigation"][number]["items"][number];
type ConfiguredNavigationItem = NavigationItem & { permission: string };

const navigation: { label: string; items: ConfiguredNavigationItem[] }[] = [
  {
    label: "운영",
    items: [
      {
        label: "대시보드",
        to: "/dashboard",
        icon: "dashboard",
        permission: "dashboard:read",
      },
    ],
  },
  {
    label: "생산",
    items: [
      {
        label: "작업지시",
        icon: "work-order",
        to: "/work-orders",
        permission: "work-order:read",
      },
      {
        label: "공정 실행",
        icon: "execution",
        to: "/execution/queue",
        permission: "process-execution:read",
      },
    ],
  },
  {
    label: "자재",
    items: [
      {
        label: "BOM 기준정보",
        icon: "bom",
        to: "/materials/boms",
        permission: "master-data:read",
      },
      {
        label: "자재 LOT",
        icon: "material",
        to: "/materials/lots",
        permission: "material-lot:read",
      },
    ],
  },
  {
    label: "품질",
    items: [
      {
        label: "검사",
        icon: "inspection",
        to: "/quality/inspections",
        permission: "inspection:read",
      },
      {
        label: "부적합·격리",
        icon: "incident",
        to: "/quality/incidents",
        permission: "quality-incident:read",
      },
    ],
  },
  {
    label: "추적",
    items: [
      {
        label: "LOT 계보",
        icon: "trace",
        to: "/traceability",
        permission: "trace:read",
      },
    ],
  },
  {
    label: "관리",
    items: [
      {
        label: "감사이력",
        icon: "audit",
        to: "/audit-events",
        permission: "audit-event:read",
      },
      {
        label: "사용자",
        icon: "users",
        to: "/admin/users",
        permission: "user:manage",
      },
    ],
  },
];

const routeTitles: Record<string, { title: string }> = {
  "/dashboard": { title: "운영 대시보드" },
  "/work-orders": { title: "작업지시" },
  "/work-orders/new": { title: "작업지시 생성" },
  "/materials/lots": { title: "자재 LOT" },
  "/materials/boms": { title: "BOM 기준정보" },
  "/execution/queue": { title: "공정 실행" },
  "/execution/lots": { title: "공정 실행" },
  "/quality/inspections": { title: "품질검사" },
  "/quality/incidents": { title: "부적합·격리" },
  "/traceability": { title: "LOT 계보" },
  "/audit-events": { title: "감사이력" },
  "/admin/users": { title: "사용자" },
  "/dev/ui-kit": { title: "UI 시스템 점검" },
  "/forbidden": { title: "접근 권한 없음" },
};

export function resolveShellContext(
  pathname: string,
  session: Session,
): AppShellConfiguration {
  const current = resolveRouteTitle(pathname);
  const allowedNavigation = navigation
    .map((group) => ({
      label: group.label,
      items: group.items
        .filter((item) => sessionHasPermission(session, item.permission))
        .map(toNavigationItem),
    }))
    .filter((group) => group.items.length > 0);

  return {
    navigation: allowedNavigation,
    pathname,
    pageTitle: current.title,
    pageGroup: resolvePageGroup(pathname),
    currentRole: session.activeRole.label,
  };
}

function resolvePageGroup(pathname: string): string | undefined {
  const exact = navigation.find((group) =>
    group.items.some(
      (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
    ),
  );
  if (exact) {
    return exact.label;
  }
  // /execution/lots/... 처럼 메뉴 경로의 하위가 아닌 상세는 첫 경로 조각(execution)으로 그룹을 찾는다.
  const [, head] = pathname.split("/");
  return navigation.find((group) =>
    group.items.some((item) => item.to?.split("/")[1] === head),
  )?.label;
}

function resolveRouteTitle(pathname: string): { title: string } {
  const exact = routeTitles[pathname];
  if (exact) {
    return exact;
  }

  const parent = Object.keys(routeTitles)
    .filter((route) => pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  return parent ? routeTitles[parent]! : { title: "화면을 찾을 수 없음" };
}

function toNavigationItem(item: ConfiguredNavigationItem): NavigationItem {
  return {
    label: item.label,
    icon: item.icon,
    ...(item.to === undefined ? {} : { to: item.to }),
    ...(item.pending === undefined ? {} : { pending: item.pending }),
  };
}
