import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { readWorkOrdersSearch, WorkOrdersPage } from "@/pages/work-orders";

export const Route = createFileRoute("/_authenticated/work-orders")({
  validateSearch: (search: Record<string, unknown>) =>
    readWorkOrdersSearch(search),
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.WORK_ORDER_READ,
      location.href,
    ),
  component: WorkOrdersRoute,
});

export function WorkOrdersRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { session } = Route.useRouteContext();

  return (
    <WorkOrdersPage
      search={search}
      canCreate={session.permissions.includes("work-order:create")}
      onCreate={() => {
        void navigate({ to: "/work-orders/new" });
      }}
      onOpenDetail={(workOrderId) => {
        void navigate({
          to: "/work-orders/$workOrderId",
          params: { workOrderId },
        });
      }}
      onSearchChange={(next) => {
        void navigate({
          to: "/work-orders",
          search: next,
          replace: true,
        });
      }}
    />
  );
}
