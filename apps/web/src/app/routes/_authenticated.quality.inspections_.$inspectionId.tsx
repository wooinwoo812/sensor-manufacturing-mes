import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { InspectionDetailPage } from "@/pages/quality-inspections";

export const Route = createFileRoute(
  "/_authenticated/quality/inspections_/$inspectionId",
)({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.INSPECTION_READ,
      location.href,
    ),
  component: InspectionDetailRoute,
});

function InspectionDetailRoute() {
  const { inspectionId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });
  const { session } = Route.useRouteContext();

  return (
    <InspectionDetailPage
      inspectionId={inspectionId}
      csrfToken={session.csrfToken}
      canVerdict={session.permissions.includes("inspection:execute")}
      onBack={() => {
        void navigate({ to: "/quality/inspections", search: {}, replace: true });
      }}
    />
  );
}
