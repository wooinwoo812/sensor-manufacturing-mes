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
        pending: true,
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
        pending: true,
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
        pending: true,
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
        pending: true,
        permission: "user:manage",
      },
    ],
  },
];

const routeTitles: Record<string, { title: string }> = {
  "/dashboard": { title: "운영 대시보드" },
  "/work-orders": { title: "작업지시" },
  "/materials/lots": { title: "자재 LOT" },
  "/execution/queue": { title: "공정 실행" },
  "/quality/inspections": { title: "품질검사" },
  "/audit-events": { title: "감사이력" },
  "/dev/ui-kit": { title: "UI 시스템 점검" },
  "/forbidden": { title: "접근 권한 없음" },
};

export function resolveShellContext(
  pathname: string,
  session: Session,
): AppShellConfiguration {
  const current = routeTitles[pathname] ?? { title: "화면을 찾을 수 없음" };
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
    currentRole: session.activeRole.label,
  };
}

function toNavigationItem(item: ConfiguredNavigationItem): NavigationItem {
  return {
    label: item.label,
    icon: item.icon,
    ...(item.to === undefined ? {} : { to: item.to }),
    ...(item.pending === undefined ? {} : { pending: item.pending }),
  };
}
