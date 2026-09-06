import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { MaterialLotDetailPage } from "@/pages/materials-lots";

export const Route = createFileRoute(
  "/_authenticated/materials/lots_/$materialLotId",
)({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.MATERIAL_LOT_READ,
      location.href,
    ),
  component: MaterialLotDetailRoute,
});

export function MaterialLotDetailRoute() {
  const { materialLotId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <MaterialLotDetailPage
      materialLotId={materialLotId}
      onOpenTrace={(lotNumber) => {
        void navigate({
          to: "/traceability",
          search: { q: lotNumber },
          replace: true,
        });
      }}
      onBack={() => {
        void navigate({ to: "/materials/lots", search: {}, replace: true });
      }}
    />
  );
}
