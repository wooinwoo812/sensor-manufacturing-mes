import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { AuditEventsPage, readAuditEventsSearch } from "@/pages/audit-events";

export const Route = createFileRoute("/_authenticated/audit-events")({
  validateSearch: (search: Record<string, unknown>) =>
    readAuditEventsSearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.AUDIT_EVENT_READ,
      location.href,
    ),
  component: AuditEventsRoute,
});

export function AuditEventsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <AuditEventsPage
      search={search}
      onSearchChange={(next) => {
        void navigate({
          to: "/audit-events",
          search: next,
          replace: false,
          resetScroll: false,
        });
      }}
    />
  );
}
