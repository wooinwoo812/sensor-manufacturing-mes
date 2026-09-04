import { createFileRoute } from "@tanstack/react-router";
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
  component: DashboardPage,
});
