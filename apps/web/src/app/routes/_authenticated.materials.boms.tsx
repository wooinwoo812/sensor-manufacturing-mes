import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { BomsPage, readBomsSearch } from "@/pages/boms";

export const Route = createFileRoute("/_authenticated/materials/boms")({
  validateSearch: (search: Record<string, unknown>) =>
    readBomsSearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.MASTER_DATA_READ,
      location.href,
    ),
  component: BomsRoute,
});

function BomsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <BomsPage
      search={search}
      onSearchChange={(next) => {
        void navigate({
          to: "/materials/boms",
          search: next,
          replace: true,
        });
      }}
    />
  );
}
