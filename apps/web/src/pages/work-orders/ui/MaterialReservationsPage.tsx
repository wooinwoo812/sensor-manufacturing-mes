import {
  fetchWorkOrderDetail,
  type WorkOrderDetail,
} from "@/entities/work-order";
import { MaterialReservationPanel } from "@/features/material-reservations";
import {
  Button,
  ErrorState,
  PageHeading,
  Skeleton,
  DataRegion,
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
    (signal) =>
      fetchWorkOrderDetail(workOrderId, signal).then((order) => ({ order })),
    "작업지시를 불러오지 못했습니다.",
  );
  const detail = state.phase === "success" ? state.order : null;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        back={{
          label: detail ? `${detail.orderNumber} 상세` : "작업지시 상세",
          onClick: onBack,
        }}
        eyebrow="작업지시 자재 예약"
        title="자재 예약"
        description={
          detail
            ? `${detail.orderNumber} ${detail.productName}의 자재 예약과 해제를 관리합니다.`
            : state.phase === "loading"
              ? "상세 정보를 불러오고 있습니다."
              : "상세 정보를 확인하지 못했습니다. 다시 시도하거나 이전 화면으로 돌아가세요."
        }
      />
      <DataRegion name="detail" loading={state.phase === "loading"}>
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
            <>
              <MaterialReservationPanel
                workOrderId={workOrderId}
                orderNumber={state.order.orderNumber}
                requirements={state.order.materialRequirements}
                csrfToken={csrfToken}
                canReserve={canReserve}
                canRelease={canRelease}
                isReleased={
                  state.order.status === "RELEASED"
                }
              />
            </>
          </>
        )}
      </DataRegion>
    </Main>
  );
}
