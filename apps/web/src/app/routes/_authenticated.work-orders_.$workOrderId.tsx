import { createFileRoute } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { WorkOrderDetailPage } from "@/pages/work-orders";

export const Route = createFileRoute(
  "/_authenticated/work-orders_/$workOrderId",
)({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.WORK_ORDER_READ,
      location.href,
    ),
  component: WorkOrderDetailRoute,
});

function WorkOrderDetailRoute() {
  const { workOrderId } = Route.useParams();
  const { session } = Route.useRouteContext();

  return (
    <WorkOrderDetailPage
      workOrderId={workOrderId}
      csrfToken={session.csrfToken}
      canRelease={session.permissions.includes("work-order:release")}
      canCancel={session.permissions.includes("work-order:cancel")}
      canReserve={session.permissions.includes("material-allocation:create")}
      canReleaseAllocation={session.permissions.includes("material-allocation:release")}
    />
  );
}
