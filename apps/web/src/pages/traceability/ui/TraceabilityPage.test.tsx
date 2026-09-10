import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchTraceNodes,
  type TraceNodeListResult,
} from "@/entities/trace-node";
import { TraceabilityPage } from "./TraceabilityPage";
import type { TraceabilitySearch } from "../model/traceability-search";

vi.mock("@/entities/trace-node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/trace-node")>();
  return {
    ...actual,
    fetchTraceNodes: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchTraceNodes);

function sampleResult(
  overrides: Partial<TraceNodeListResult> = {},
): TraceNodeListResult {
  return {
    items: [
      {
        id: "trace-m-3",
        nodeType: "MATERIAL_LOT",
        label: "ML-2026-0331",
        materialLotId: "lot-9",
        productionLotNumber: null,
        upstreamCount: 0,
        downstreamCount: 1,
        createdAt: "2026-09-01T02:10:00.000Z",
      },
      {
        id: "trace-p-1",
        nodeType: "PRODUCTION_LOT",
        label: "PL-2026-091A",
        materialLotId: null,
        productionLotNumber: "PL-2026-091A",
        upstreamCount: 2,
        downstreamCount: 0,
        createdAt: "2026-09-02T01:00:00.000Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    ...overrides,
  };
}

function renderPage(search: TraceabilitySearch = {}) {
  const onSearchChange = vi.fn();
  const onOpenDetail = vi.fn();
  render(
    <TraceabilityPage
      search={search}
      onSearchChange={onSearchChange}
      onOpenDetail={onOpenDetail}
    />,
  );
  return { onSearchChange, onOpenDetail };
}

describe("TraceabilityPage", () => {
  it("추적 노드 목록을 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(await screen.findByText("ML-2026-0331")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("PL-2026-091A"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("자재 LOT"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("생산 LOT"),
    ).toBeInTheDocument();
  });

  it("검색어를 입력하면 검색 조건을 반영한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    const input = screen.getByLabelText("추적 노드 검색");
    await userEvent.type(input, "0331{Enter}");

    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ q: "0331" }),
    );
  });

  it("행을 누르면 상세 화면을 요청한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    const { onOpenDetail } = renderPage();

    // 행 전체가 상세 입구다(별도의 "계보 열기" 버튼은 없앴다).
    const record = await screen.findByText("ML-2026-0331");
    await userEvent.click(record.closest("tr")!);

    expect(onOpenDetail).toHaveBeenCalledWith("trace-m-3");
  });

  it("조건에 맞는 노드가 없으면 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult({ items: [], total: 0 }));
    renderPage({ q: "없는번호" });

    expect(
      await screen.findByText("조건에 맞는 추적 노드가 없습니다"),
    ).toBeInTheDocument();
  });
});
