import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { MaterialLotsPage, readMaterialLotsSearch } from "@/pages/materials-lots";

export const Route = createFileRoute("/_authenticated/materials/lots")({
  validateSearch: (search: Record<string, unknown>) =>
    readMaterialLotsSearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.MATERIAL_LOT_READ,
      location.href,
    ),
  component: MaterialLotsRoute,
});

function MaterialLotsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { session } = Route.useRouteContext();

  return (
    <MaterialLotsPage
      search={search}
      csrfToken={session.csrfToken}
      canDecideQuality={session.permissions.includes("material-lot:decide-quality")}
      onOpenDetail={(materialLotId) => {
        void navigate({
          to: "/materials/lots/$materialLotId",
          params: { materialLotId },
        });
      }}
      onSearchChange={(next) => {
        void navigate({
          to: "/materials/lots",
          search: next,
          replace: true,
        });
      }}
    />
  );
}
