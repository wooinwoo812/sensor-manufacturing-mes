import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { WorkOrderCreatePage } from "@/pages/work-orders";

export const Route = createFileRoute("/_authenticated/work-orders_/new")({
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.WORK_ORDER_CREATE,
      location.href,
    ),
  component: WorkOrderCreateRoute,
});

function WorkOrderCreateRoute() {
  const navigate = useNavigate();
  const { session } = Route.useRouteContext();

  return (
    <WorkOrderCreatePage
      csrfToken={session.csrfToken}
      onCreated={(workOrderId) => {
        void navigate({
          to: "/work-orders/$workOrderId",
          params: { workOrderId },
          replace: true,
        });
      }}
      onCancel={() => {
        void navigate({ to: "/work-orders", search: {} });
      }}
    />
  );
}
