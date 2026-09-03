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

function sampleDetail(overrides: Partial<WorkOrderDetail> = {}): WorkOrderDetail {
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
    />,
  );
}

describe("WorkOrderDetailPage", () => {
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
    await userEvent.click(screen.getByRole("button", { name: "작업지시 발행" }));
    await userEvent.click(await screen.findByRole("button", { name: "발행 확정" }));

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledWith("wo-1", "test-csrf");
    });
  });

  it("취소는 사유 입력 후 command를 실행한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    cancelMock.mockResolvedValue(sampleDetail({ status: "CANCELLED" }));
    renderPage();

    await screen.findByText("WO-2026-093");
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
      screen.getByText(/발행은 생산계획 담당자 권한\(work-order:release\)이 필요합니다/),
    ).toBeInTheDocument();
  });
});
