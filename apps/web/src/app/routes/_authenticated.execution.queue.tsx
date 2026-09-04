import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { ExecutionQueuePage, readExecutionQueueSearch } from "@/pages/execution-queue";

export const Route = createFileRoute("/_authenticated/execution/queue")({
  validateSearch: (search: Record<string, unknown>) =>
    readExecutionQueueSearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.PROCESS_EXECUTION_READ,
      location.href,
    ),
  component: ExecutionQueueRoute,
});

export function ExecutionQueueRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { session } = Route.useRouteContext();

  return (
    <ExecutionQueuePage
      search={search}
      csrfToken={session.csrfToken}
      canExecute={session.permissions.includes("process-execution:execute")}
      onSearchChange={(next) => {
        void navigate({
          to: "/execution/queue",
          search: next,
          replace: true,
        });
      }}
      onOpenDetail={(row) => {
        void navigate({
          to: "/execution/lots/$productionLotId/steps/$processStepRevisionId",
          params: { productionLotId: row.productionLotNumber, processStepRevisionId: row.id },
        });
      }}
    />
  );
}
