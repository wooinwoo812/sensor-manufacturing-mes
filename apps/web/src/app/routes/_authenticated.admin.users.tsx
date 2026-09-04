import { createFileRoute } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { AdminUsersPage } from "@/pages/admin-users";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.USER_MANAGE,
      location.href,
    ),
  component: AdminUsersRoute,
});

export function AdminUsersRoute() {
  const { session } = Route.useRouteContext();

  return <AdminUsersPage csrfToken={session.csrfToken} />;
}
