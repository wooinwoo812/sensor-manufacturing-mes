import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  requireRoutePermission,
  RoutePermission,
} from "@/app/session-policy";
import { MaterialReservationsPage } from "@/pages/work-orders";

export const Route = createFileRoute(
  "/_authenticated/work-orders_/$workOrderId/material-reservations",
)({
  validateSearch: (search: Record<string, unknown>) => {
    const requirementId =
      typeof search.requirementId === "string" && search.requirementId !== ""
        ? search.requirementId
        : undefined;
    return { ...(requirementId === undefined ? {} : { requirementId }) };
  },
  beforeLoad: ({ context, location }) =>
    requireRoutePermission(
      context.session,
      RoutePermission.WORK_ORDER_READ,
      location.href,
    ),
  component: MaterialReservationsRoute,
});

export function MaterialReservationsRoute() {
  const { workOrderId } = Route.useParams();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <MaterialReservationsPage
      workOrderId={workOrderId}
      csrfToken={session.csrfToken}
      canReserve={session.permissions.includes("material-allocation:create")}
      canRelease={session.permissions.includes("material-allocation:release")}
      onBack={() => {
        void navigate({
          to: "/work-orders/$workOrderId",
          params: { workOrderId },
          replace: true,
        });
      }}
    />
  );
}
