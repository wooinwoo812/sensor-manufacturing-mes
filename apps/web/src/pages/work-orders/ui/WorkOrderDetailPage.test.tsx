import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  cancelWorkOrder,
  fetchWorkOrderDetail,
  releaseWorkOrder,
  type WorkOrderDetail,
} from "@/entities/work-order";
import { WorkOrderDetailPage } from "./WorkOrderDetailPage";

vi.mock("@/entities/work-order", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/work-order")>();
  return {
    ...actual,
    fetchWorkOrderDetail: vi.fn(),
    releaseWorkOrder: vi.fn(),
    cancelWorkOrder: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchWorkOrderDetail);
const releaseMock = vi.mocked(releaseWorkOrder);
const cancelMock = vi.mocked(cancelWorkOrder);

function sampleDetail(
  overrides: Partial<WorkOrderDetail> = {},
): WorkOrderDetail {
  return {
    id: "wo-1",
    orderNumber: "WO-2026-093",
    productCode: "SEN-IR-320-QC",
    productName: "적외선 코어 320px QC 버전",
    plannedQuantity: 200,
    unit: "EA",
    dueDate: "2026-09-12T08:00:00.000Z",
    status: "DRAFT",
    priority: "NORMAL",
    progressPercent: 0,
    currentStepName: null,
    blockedReason: null,
    memo: "검증용 초안",
    createdAt: "2026-09-01T01:00:00.000Z",
    steps: [
      {
        id: "step-1",
        sequence: 10,
        processStepName: "절단 1공정",
        productionLotNumber: "PL-2026-093A",
        readiness: "READY",
        blockedReasonCodes: [],
      },
    ],
    inspections: [],
    materialRequirements: [],
    recentAudits: [
      {
        id: "audit-1",
        occurredAt: "2026-09-01T01:00:00.000Z",
        actorName: "생산계획 데모",
        actorRole: "PRODUCTION_PLANNER",
        action: "WORK_ORDER_CREATED",
        summary: "적외선 코어 320px QC 버전 200EA 초안 작업지시 생성",
      },
    ],
    ...overrides,
  };
}

function renderPage(
  overrides: {
    canRelease?: boolean;
    canCancel?: boolean;
    canReserve?: boolean;
    canReleaseAllocation?: boolean;
  } = {},
) {
  render(
    <WorkOrderDetailPage
      workOrderId="wo-1"
      csrfToken="test-csrf"
      canRelease={overrides.canRelease ?? true}
      canCancel={overrides.canCancel ?? true}
      canReserve={overrides.canReserve ?? false}
      canReleaseAllocation={overrides.canReleaseAllocation ?? false}
      onBack={() => {}}
    />,
  );
}

describe("WorkOrderDetailPage", () => {
  it("권한이 허용한 공정과 검사 상세로 이동한다", async () => {
    const onOpenProcess = vi.fn();
    const onOpenInspection = vi.fn();
    fetchMock.mockResolvedValue(sampleDetail({ inspections: [{ id: "inspection-1", inspectionNumber: "IN-001", processStepName: "절단 1공정", gate: "ROUTE_ADVANCE", specName: "치수 검사", executionStatus: "PENDING", verdict: null }] }));
    render(<WorkOrderDetailPage workOrderId="wo-1" csrfToken="csrf" canRelease={false} canCancel={false} canReserve={false} canReleaseAllocation={false} onBack={() => {}} onOpenProcess={onOpenProcess} onOpenInspection={onOpenInspection} />);
    await userEvent.click(await screen.findByRole("button", { name: "절단 1공정" }));
    expect(onOpenProcess).toHaveBeenCalledWith("step-1", "PL-2026-093A");
    await userEvent.click(screen.getByRole("button", { name: "IN-001" }));
    expect(onOpenInspection).toHaveBeenCalledWith("inspection-1");
  });

  it("이동 권한이 없으면 공정 이름을 조회용 텍스트로 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    renderPage();
    expect(await screen.findByText("절단 1공정")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "절단 1공정" })).not.toBeInTheDocument();
  });
  it("첫 조회가 끝나도 제목 DOM과 돌아가기 위치를 유지한다", async () => {
    let resolveDetail!: (detail: WorkOrderDetail) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDetail = resolve;
      }),
    );
    renderPage();
    const heading = screen.getByRole("heading", { level: 1, name: "작업지시" });
    const back = screen.getByRole("button", { name: "작업지시 목록" });
    resolveDetail(sampleDetail());
    expect(
      await screen.findByRole("heading", { level: 1, name: "WO-2026-093" }),
    ).toBe(heading);
    expect(screen.getByRole("button", { name: "작업지시 목록" })).toBe(back);
  });
  it("자재 예약 조회 권한이 없으면 예약 패널과 진입 버튼을 표시하지 않는다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    render(
      <WorkOrderDetailPage
        workOrderId="wo-1"
        csrfToken="test"
        canRelease={false}
        canCancel={false}
        canReserve={false}
        canReleaseAllocation={false}
        canReadReservations={false}
        onBack={() => {}}
        onOpenReservations={() => {}}
      />,
    );
    await screen.findByRole("heading", { name: "요약" });
    expect(
      screen.queryByRole("button", { name: "자재 예약" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "자재 예약" }),
    ).not.toBeInTheDocument();
  });
  it("요약·공정·변경 이력을 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    renderPage();

    expect(await screen.findByText("WO-2026-093")).toBeInTheDocument();
    expect(screen.getByText("요약")).toBeInTheDocument();
    expect(screen.getByText("절단 1공정")).toBeInTheDocument();
    expect(screen.getByText("PL-2026-093A")).toBeInTheDocument();
    expect(screen.getByText(/초안 작업지시 생성/)).toBeInTheDocument();
    expect(screen.getByText("검증용 초안")).toBeInTheDocument();
  });

  it("발행 확정 버튼은 확인 대화상자로 command를 실행한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    releaseMock.mockResolvedValue(sampleDetail({ status: "RELEASED" }));
    renderPage();

    await screen.findByText("WO-2026-093");
    await userEvent.click(
      screen.getByRole("button", { name: "작업지시 발행" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "발행 확정" }),
    );

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledWith("wo-1", "test-csrf");
    });
  });

  it("취소는 사유 입력 후 command를 실행한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    cancelMock.mockResolvedValue(sampleDetail({ status: "CANCELLED" }));
    renderPage();

    await screen.findByText("WO-2026-093");
    // 취소 폼은 제목 오른쪽 "작업지시 취소" 버튼으로 연다.
    await userEvent.click(
      screen.getByRole("button", { name: "작업지시 취소" }),
    );
    const reasonInput = screen.getByLabelText("취소 사유");
    await userEvent.type(reasonInput, "계획 변경");
    await userEvent.click(screen.getByRole("button", { name: "취소 확정" }));

    await waitFor(() => {
      expect(cancelMock).toHaveBeenCalledWith("wo-1", "계획 변경", "test-csrf");
    });
  });

  it("발행 권한이 없으면 필요한 권한을 설명한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    renderPage({ canRelease: false });

    await screen.findByText("WO-2026-093");
    expect(
      screen.queryByRole("button", { name: "작업지시 발행" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /발행은 생산계획 담당자가 처리합니다/,
      ),
    ).toBeInTheDocument();
  });
});
