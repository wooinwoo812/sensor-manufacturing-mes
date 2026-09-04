import { useEffect, useState } from "react";
import { fetchWorkOrderDetail, type WorkOrderDetail } from "@/entities/work-order";
import { MaterialReservationPanel } from "@/features/material-reservations";
import { ApiRequestError } from "@/shared/api";
import {
  Button,
  ErrorState,
  PageHeading,
  Skeleton,
} from "@/shared/ui";
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
  const [reloadCount] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    state:
      | { phase: "error"; message: string }
      | { phase: "success"; order: WorkOrderDetail };
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkOrderDetail(workOrderId, controller.signal)
      .then((order) => {
        setResult({ key: workOrderId, state: { phase: "success", order } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          key: workOrderId,
          state: {
            phase: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "작업지시를 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      controller.abort();
    };
  }, [workOrderId, reloadCount]);

  const state:
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "success"; order: WorkOrderDetail } =
    result !== null && result.key === workOrderId
      ? result.state
      : { phase: "loading" };

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
