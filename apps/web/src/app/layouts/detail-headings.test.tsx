import { fireEvent, render, screen } from "@testing-library/react";
import { useLoadState } from "@/shared/lib";
import {
  WorkOrderDetailPage,
  MaterialReservationsPage,
} from "@/pages/work-orders";
import { MaterialLotDetailPage } from "@/pages/materials-lots";
import { InspectionDetailPage } from "@/pages/quality-inspections";
import { ProcessExecutionDetailPage } from "@/pages/process-execution";
import { QualityIncidentDetailPage } from "@/pages/quality-incidents";
import { TraceNodeDetailPage } from "@/pages/traceability";

vi.mock("@/shared/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib")>()),
  useLoadState: vi.fn(),
}));
const back = vi.fn();
const pages = [
  {
    title: "작업지시",
    back: "작업지시 목록",
    element: (
      <WorkOrderDetailPage
        workOrderId="test"
        csrfToken="test"
        canRelease={false}
        canCancel={false}
        canReserve={false}
        canReleaseAllocation={false}
        onBack={back}
      />
    ),
  },
  {
    title: "자재 예약",
    back: "작업지시 상세",
    element: (
      <MaterialReservationsPage
        workOrderId="test"
        csrfToken="test"
        canReserve={false}
        canRelease={false}
        onBack={back}
      />
    ),
  },
  {
    title: "자재 LOT",
    back: "자재 LOT 목록",
    element: <MaterialLotDetailPage materialLotId="test" onBack={back} />,
  },
  {
    title: "품질검사",
    back: "검사 목록",
    element: (
      <InspectionDetailPage
        inspectionId="test"
        csrfToken="test"
        canVerdict={false}
        onBack={back}
      />
    ),
  },
  {
    title: "공정 실행",
    back: "공정 실행 대기열",
    element: (
      <ProcessExecutionDetailPage
        stepId="test"
        csrfToken="test"
        canExecute={false}
        onBack={back}
      />
    ),
  },
  {
    title: "부적합 사건",
    back: "부적합·격리 목록",
    element: (
      <QualityIncidentDetailPage qualityIncidentId="test" onBack={back} />
    ),
  },
  {
    title: "LOT 계보",
    back: "LOT 계보 목록",
    element: (
      <TraceNodeDetailPage
        traceNodeId="test"
        onBack={back}
        onOpenNode={() => undefined}
      />
    ),
  },
];
describe.each(["loading", "error"] as const)("상세 화면 %s", (phase) => {
  it.each(pages)("$title 제목과 돌아가기를 유지한다", (page) => {
    back.mockClear();
    vi.mocked(useLoadState).mockReturnValue({
      state: phase === "loading" ? { phase } : { phase, message: "조회 실패" },
      isRefreshing: false,
      reload: vi.fn(),
      replace: vi.fn(),
    });
    render(page.element);
    expect(
      screen.getByRole("heading", { level: 1, name: page.title }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: page.back }));
    expect(back).toHaveBeenCalledOnce();
  });
});
