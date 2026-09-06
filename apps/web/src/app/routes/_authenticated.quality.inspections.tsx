import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { InspectionsPage, readInspectionsSearch } from "@/pages/quality-inspections";

export const Route = createFileRoute("/_authenticated/quality/inspections")({
  validateSearch: (search: Record<string, unknown>) =>
    readInspectionsSearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.INSPECTION_READ,
      location.href,
    ),
  component: InspectionsRoute,
});

export function InspectionsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { session } = Route.useRouteContext();

  return (
    <InspectionsPage
      search={search}
      csrfToken={session.csrfToken}
      canVerdict={session.permissions.includes("inspection:execute")}
      onOpenDetail={(inspectionId) => {
        void navigate({
          to: "/quality/inspections/$inspectionId",
          params: { inspectionId },
        });
      }}
      onSearchChange={(next) => {
        void navigate({
          to: "/quality/inspections",
          search: next,
          replace: false,
          resetScroll: false,
        });
      }}
    />
  );
}
