import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
beforeEach(() => fetchMock.mockReset());

function sampleResult(
  overrides: Partial<WorkOrderListResult> = {},
): WorkOrderListResult {
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
  it("열 정렬은 적용된 필터를 보존하고 첫 페이지의 전체 결과를 요청한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage({
      page: 3,
      pageSize: 20,
      q: "센서",
      sort: "dueDate",
      order: "asc",
    });
    await screen.findByText("WO-2026-091");
    expect(fetchMock.mock.calls[0]?.[0].get("sort")).toBe("dueDate");
    expect(fetchMock.mock.calls[0]?.[0].get("order")).toBe("asc");
    await userEvent.click(
      screen.getByRole("button", { name: "납기 내림차순 정렬" }),
    );
    expect(onSearchChange).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      q: "센서",
      sort: "dueDate",
      order: "desc",
    });
  });
  it("작업지시 목록을 핵심 열과 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0].get("pageSize")).toBe("10");
    expect(await screen.findByText("WO-2026-091")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("적외선 센서 모듈 640px"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("진행 중"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("높음"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText(
        "자재 LOT 부족 (SEN-MAT-014)",
      ),
    ).toBeInTheDocument();
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

    expect(
      await screen.findByText("데이터를 불러오지 못했습니다"),
    ).toBeInTheDocument();

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
    expect(onSearchChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "조회" }));

    expect(onSearchChange).toHaveBeenCalledWith({ due: "overdue" });
  });

  it("차단 필터는 blocked 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "차단" }));
    await user.click(await screen.findByRole("option", { name: "차단만" }));
    expect(onSearchChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "조회" }));

    expect(onSearchChange).toHaveBeenCalledWith({ blocked: true });
  });
});

it("페이지의 No는 조회 전체 건수에서 역순이며 번호 이동은 적용된 필터를 유지한다", async () => {
  fetchMock.mockResolvedValue(sampleResult({ page: 2, total: 43 }));
  const { onSearchChange } = renderPage({ page: 2, status: ["IN_PROGRESS"] });
  await screen.findByText("WO-2026-091");
  const rows = screen.getAllByRole("row").slice(1);
  expect(within(rows[0]!).getAllByRole("cell")[0]).toHaveTextContent("23");
  expect(within(rows[1]!).getAllByRole("cell")[0]).toHaveTextContent("22");
  for (const name of ["계획수량", "진행률", "납기", "상태", "우선순위"]) {
    expect(screen.getByRole("columnheader", { name })).toHaveStyle({
      textAlign: "center",
    });
  }
  expect(screen.getByRole("columnheader", { name: "제품" })).toHaveStyle({
    textAlign: "left",
  });
  const nav = screen.getByRole("navigation", { name: "작업지시 페이지 탐색" });
  expect(nav.closest("[data-tour-region]")).not.toBeNull();
  await userEvent.click(within(nav).getByRole("button", { name: "3페이지" }));
  expect(onSearchChange).toHaveBeenCalledWith({
    page: 3,
    status: ["IN_PROGRESS"],
  });
});

it("표시 건수 변경은 필터를 보존하고 1페이지로 돌아간다", async () => {
  fetchMock.mockResolvedValue(
    sampleResult({ page: 2, pageSize: 10, total: 43 }),
  );
  const { onSearchChange } = renderPage({ page: 2, priority: ["HIGH"] });
  await screen.findByText("WO-2026-091");
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(
    screen.getByRole("combobox", { name: "페이지당 표시 건수" }),
  );
  await user.click(screen.getByRole("option", { name: "20건씩 보기" }));
  expect(onSearchChange).toHaveBeenCalledExactlyOnceWith({
    priority: ["HIGH"],
    pageSize: 20,
  });
});
