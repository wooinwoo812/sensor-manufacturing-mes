import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchWorkOrders,
  type WorkOrderListResult,
} from "@/entities/work-order";
import { WorkOrdersPage } from "./WorkOrdersPage";
import type { WorkOrdersListSearch } from "../model/work-orders-search";

vi.mock("@/entities/work-order", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/work-order")>();
  return {
    ...actual,
    fetchWorkOrders: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchWorkOrders);

function sampleResult(overrides: Partial<WorkOrderListResult> = {}): WorkOrderListResult {
  return {
    items: [
      {
        id: "work-order-1",
        orderNumber: "WO-2026-091",
        productCode: "SEN-IR-640",
        productName: "적외선 센서 모듈 640px",
        plannedQuantity: 120,
        unit: "EA",
        dueDate: "2026-09-05T08:00:00.000Z",
        status: "IN_PROGRESS",
        priority: "HIGH",
        progressPercent: 45,
        currentStepName: "조립 2공정",
        blockedReason: null,
      memo: null,
      },
      {
        id: "work-order-2",
        orderNumber: "WO-2026-092",
        productCode: "SEN-XR-1280",
        productName: "X선 검출기 패널 1280px",
        plannedQuantity: 40,
        unit: "EA",
        dueDate: "2026-08-31T08:00:00.000Z",
        status: "RELEASED",
        priority: "URGENT",
        progressPercent: 0,
        currentStepName: "라인 투입 대기",
        blockedReason: "자재 LOT 부족 (SEN-MAT-014)",
      memo: null,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    ...overrides,
  };
}

function renderPage(search: WorkOrdersListSearch = {}) {
  const onSearchChange = vi.fn();
  const onOpenDetail = vi.fn();
  render(
    <WorkOrdersPage
      search={search}
      onSearchChange={onSearchChange}
      onOpenDetail={onOpenDetail}
      canCreate
      onCreate={() => undefined}
    />,
  );
  return { onSearchChange, onOpenDetail };
}

describe("WorkOrdersPage", () => {
  it("작업지시 목록을 핵심 열과 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe("");
    expect(await screen.findByText("WO-2026-091")).toBeInTheDocument();
    expect(screen.getByText("적외선 센서 모듈 640px")).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toBeInTheDocument();
    expect(screen.getByText("높음")).toBeInTheDocument();
    expect(screen.getByText("자재 LOT 부족 (SEN-MAT-014)")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "작업지시 목록" }),
    ).toBeInTheDocument();
  });

  it("조회 결과가 없으면 조건 초기화 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult({ items: [], total: 0 }));
    renderPage();

    expect(
      await screen.findByText("조건에 맞는 작업지시가 없습니다"),
    ).toBeInTheDocument();
  });

  it("조회 실패 시 오류 상태와 다시 시도를 제공한다", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    renderPage();

    expect(await screen.findByText("데이터를 불러오지 못했습니다")).toBeInTheDocument();

    fetchMock.mockResolvedValue(sampleResult());
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => {
      expect(screen.getByText("WO-2026-091")).toBeInTheDocument();
    });
  });

  it("납기 필터 선택은 URL search 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "납기" }));
    await user.click(await screen.findByRole("option", { name: "납기 지연" }));

    expect(onSearchChange).toHaveBeenCalledWith({ due: "overdue" });
  });

  it("차단 필터는 blocked 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "차단" }));
    await user.click(await screen.findByRole("option", { name: "차단만" }));

    expect(onSearchChange).toHaveBeenCalledWith({ blocked: true });
  });
});
