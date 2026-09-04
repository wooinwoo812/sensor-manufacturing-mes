import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { IncidentsPage, readIncidentsSearch } from "@/pages/quality-incidents";

export const Route = createFileRoute("/_authenticated/quality/incidents")({
  validateSearch: (search: Record<string, unknown>) =>
    readIncidentsSearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.QUALITY_INCIDENT_READ,
      location.href,
    ),
  component: IncidentsRoute,
});

export function IncidentsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { session } = Route.useRouteContext();

  return (
    <IncidentsPage
      search={search}
      csrfToken={session.csrfToken}
      canRegister={session.permissions.includes("quality-incident:create")}
      onOpenDetail={(qualityIncidentId) => {
        void navigate({
          to: "/quality/incidents/$qualityIncidentId",
          params: { qualityIncidentId },
        });
      }}
      onSearchChange={(next) => {
        void navigate({
          to: "/quality/incidents",
          search: next,
          replace: true,
        });
      }}
    />
  );
}
