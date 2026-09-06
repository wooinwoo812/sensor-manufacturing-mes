import {
  createFileRoute,
  Outlet,
  useChildMatches,
  useNavigate,
} from "@tanstack/react-router";
import { requireRoutePermission, RoutePermission } from "@/app/session-policy";
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

export function WorkOrderDetailRoute() {
  const { workOrderId } = Route.useParams();
  const { session } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });
  const hasChildRoute = useChildMatches({
    select: (matches) => matches.length > 0,
  });

  // Nested reservation routes own their complete page, including the main landmark.
  if (hasChildRoute) return <Outlet />;

  return (
    <WorkOrderDetailPage
      workOrderId={workOrderId}
      csrfToken={session.csrfToken}
      {...(session.permissions.includes("process-execution:read") ? {
        onOpenProcess: (id: string, productionLotNumber: string) => {
          void navigate({ to: "/execution/lots/$productionLotId/steps/$processStepRevisionId", params: { productionLotId: productionLotNumber, processStepRevisionId: id } });
        },
      } : {})}
      {...(session.permissions.includes("inspection:read") ? {
        onOpenInspection: (id: string) => {
          void navigate({ to: "/quality/inspections/$inspectionId", params: { inspectionId: id } });
        },
      } : {})}
      canRelease={session.permissions.includes("work-order:release")}
      canCancel={session.permissions.includes("work-order:cancel")}
      canReserve={session.permissions.includes("material-allocation:create")}
      canReadReservations={session.permissions.includes(
        "material-allocation:read",
      )}
      canReleaseAllocation={session.permissions.includes(
        "material-allocation:release",
      )}
      onOpenReservations={() => {
        void navigate({
          to: "/work-orders/$workOrderId/material-reservations",
          params: { workOrderId },
          search: {},
        });
      }}
      onBack={() => {
        void navigate({ to: "/work-orders", search: {}, replace: true });
      }}
    />
  );
}
