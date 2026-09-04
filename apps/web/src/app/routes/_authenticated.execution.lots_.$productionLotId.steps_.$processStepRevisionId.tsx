import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { ProcessExecutionDetailPage } from "@/pages/process-execution";

export const Route = createFileRoute(
  "/_authenticated/execution/lots_/$productionLotId/steps_/$processStepRevisionId",
)({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.PROCESS_EXECUTION_READ,
      location.href,
    ),
  component: ProcessExecutionDetailRoute,
});

function ProcessExecutionDetailRoute() {
  const { processStepRevisionId } = Route.useParams();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <ProcessExecutionDetailPage
      stepId={processStepRevisionId}
      csrfToken={session.csrfToken}
      canExecute={session.permissions.includes("process-execution:execute")}
      onBack={() => {
        void navigate({ to: "/execution/queue", search: {}, replace: true });
      }}
    />
  );
}
