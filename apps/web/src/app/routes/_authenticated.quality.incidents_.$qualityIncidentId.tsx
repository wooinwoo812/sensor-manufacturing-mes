import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { QualityIncidentDetailPage } from "@/pages/quality-incidents";

export const Route = createFileRoute(
  "/_authenticated/quality/incidents_/$qualityIncidentId",
)({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.QUALITY_INCIDENT_READ,
      location.href,
    ),
  component: QualityIncidentDetailRoute,
});

function QualityIncidentDetailRoute() {
  const { qualityIncidentId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <QualityIncidentDetailPage
      qualityIncidentId={qualityIncidentId}
      onBack={() => {
        void navigate({ to: "/quality/incidents", search: {}, replace: true });
      }}
    />
  );
}
