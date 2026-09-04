import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { DashboardPage } from "@/pages/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.DASHBOARD_READ,
      location.href,
    ),
  component: DashboardRoute,
});

export function DashboardRoute() {
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <DashboardPage
      onOpenAttention={(item) => {
        // 코드 접두어로 대상 목록을 고른다: WO=작업지시, PL=생산 LOT(공정 실행), INSP=검사
        const search = { q: item.code };
        if (item.code.startsWith("INSP-")) {
          void navigate({ to: "/quality/inspections", search });
        } else if (item.code.startsWith("PL-")) {
          void navigate({ to: "/execution/queue", search });
        } else {
          void navigate({ to: "/work-orders", search });
        }
      }}
    />
  );
}
