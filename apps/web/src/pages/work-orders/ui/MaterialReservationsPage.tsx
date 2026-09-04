import { fetchWorkOrderDetail, type WorkOrderDetail } from "@/entities/work-order";
import { MaterialReservationPanel } from "@/features/material-reservations";
import {
  Button,
  ErrorState,
  PageHeading,
  Skeleton,
} from "@/shared/ui";
import { useLoadState } from "@/shared/lib";
import { Main, PageCrumb } from "@/widgets/app-shell";

interface MaterialReservationsPageProps {
  workOrderId: string;
  csrfToken: string;
  canReserve: boolean;
  canRelease: boolean;
  onBack: () => void;
}

export function MaterialReservationsPage({
  workOrderId,
  csrfToken,
  canReserve,
  canRelease,
  onBack,
}: MaterialReservationsPageProps) {
  const { state } = useLoadState<{ order: WorkOrderDetail }>(
    workOrderId,
    (signal) => fetchWorkOrderDetail(workOrderId, signal).then((order) => ({ order })),
    "작업지시를 불러오지 못했습니다.",
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      {state.phase === "loading" ? (
        <Skeleton className="h-64 w-full" />
      ) : state.phase === "error" ? (
        <ErrorState
          title="자재 예약을 불러올 수 없습니다"
          description={state.message}
          action={
            <Button variant="secondary" onClick={onBack}>
              작업지시로
            </Button>
          }
        />
      ) : (
        <>
          <PageCrumb value={`${state.order.orderNumber} · 자재 예약`} />
          <PageHeading
            back={{ label: `${state.order.orderNumber} 상세`, onClick: onBack }}
            description={`${state.order.orderNumber} ${state.order.productName}의 자재 예약과 해제를 관리합니다.`}
            eyebrow="작업지시 자재 예약"
            title="자재 예약"
          />
          <div className="mt-2">
            <MaterialReservationPanel
              workOrderId={workOrderId}
              orderNumber={state.order.orderNumber}
              csrfToken={csrfToken}
              canReserve={canReserve}
              canRelease={canRelease}
              isReleased={state.order.status === "RELEASED" || state.order.status === "IN_PROGRESS"}
            />
          </div>
        </>
      )}
    </Main>
  );
}
