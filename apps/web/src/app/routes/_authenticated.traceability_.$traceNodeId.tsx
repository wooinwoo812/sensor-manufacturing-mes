import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { TraceNodeDetailPage } from "@/pages/traceability";

export const Route = createFileRoute(
  "/_authenticated/traceability_/$traceNodeId",
)({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.TRACE_READ,
      location.href,
    ),
  component: TraceNodeDetailRoute,
});

function TraceNodeDetailRoute() {
  const { traceNodeId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <TraceNodeDetailPage
      traceNodeId={traceNodeId}
      onBack={() => {
        void navigate({ to: "/traceability", search: {}, replace: true });
      }}
      onOpenNode={(nextNodeId) => {
        void navigate({
          to: "/traceability/$traceNodeId",
          params: { traceNodeId: nextNodeId },
        });
      }}
    />
  );
}
