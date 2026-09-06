import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireRoutePermission, RoutePermission } from "@/app/session-policy";
import { AdminUsersPage, readAdminUsersSearch } from "@/pages/admin-users";

export const Route = createFileRoute("/_authenticated/admin/users")({
  validateSearch: readAdminUsersSearch,
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
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <AdminUsersPage
      csrfToken={session.csrfToken}
      currentUserId={session.user.id}
      search={search}
      onSearchChange={(next) => {
        void navigate({
          to: "/admin/users",
          search: next,
          replace: false,
          resetScroll: false,
        });
      }}
    />
  );
}
