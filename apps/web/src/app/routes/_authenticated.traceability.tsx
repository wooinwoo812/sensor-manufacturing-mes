import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { TraceabilityPage, readTraceabilitySearch } from "@/pages/traceability";

export const Route = createFileRoute("/_authenticated/traceability")({
  validateSearch: (search: Record<string, unknown>) =>
    readTraceabilitySearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.TRACE_READ,
      location.href,
    ),
  component: TraceabilityRoute,
});

export function TraceabilityRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <TraceabilityPage
      search={search}
      onSearchChange={(next) => {
        void navigate({
          to: "/traceability",
          search: next,
          replace: false,
          resetScroll: false,
        });
      }}
      onOpenDetail={(traceNodeId) => {
        void navigate({
          to: "/traceability/$traceNodeId",
          params: { traceNodeId },
        });
      }}
    />
  );
}
