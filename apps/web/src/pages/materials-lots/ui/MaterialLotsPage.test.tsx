import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchMaterialLots,
  type MaterialLotListResult,
} from "@/entities/material-lot";
import { MaterialLotsPage } from "./MaterialLotsPage";
import type { MaterialLotsListSearch } from "../model/material-lots-search";

vi.mock("@/entities/material-lot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/material-lot")>();
  return {
    ...actual,
    fetchMaterialLots: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchMaterialLots);

function sampleResult(overrides: Partial<MaterialLotListResult> = {}): MaterialLotListResult {
  return {
    items: [
      {
        id: "lot-1",
        lotNumber: "ML-2026-0323",
        materialCode: "SEN-MAT-032",
        materialName: "TE 쿨링 모듈",
        unit: "EA",
        receivedQuantity: 100,
        onHand: 100,
        reservedQuantity: 0,
        consumedQuantity: 0,
        scrappedQuantity: 0,
        availableQuantity: 0,
        qualityDisposition: "QUARANTINED",
        expiresAt: "2026-09-13T00:00:00.000Z",
        receivedAt: "2026-08-04T00:00:00.000Z",
      },
      {
        id: "lot-2",
        lotNumber: "ML-2026-0301",
        materialCode: "SEN-MAT-014",
        materialName: "적외선 감지 다이오드 어레이",
        unit: "EA",
        receivedQuantity: 500,
        onHand: 320,
        reservedQuantity: 120,
        consumedQuantity: 180,
        scrappedQuantity: 0,
        availableQuantity: 200,
        qualityDisposition: "ACCEPTED",
        expiresAt: null,
        receivedAt: "2026-08-14T00:00:00.000Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    ...overrides,
  };
}

function renderPage(search: MaterialLotsListSearch = {}) {
  const onSearchChange = vi.fn();
  render(
    <MaterialLotsPage
      search={search}
      onSearchChange={onSearchChange}
      onOpenDetail={vi.fn()}
      csrfToken="test-csrf"
      canDecideQuality={false}
    />,
  );
  return { onSearchChange };
}

describe("MaterialLotsPage", () => {
  it("자재 LOT 목록을 핵심 열과 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(await screen.findByText("ML-2026-0323")).toBeInTheDocument();
    expect(screen.getByText("TE 쿨링 모듈")).toBeInTheDocument();
    expect(screen.getByText("격리")).toBeInTheDocument();
    expect(screen.getByText("허입")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "자재 LOT 목록" }),
    ).toBeInTheDocument();
  });

  it("조회 결과가 없으면 조건 초기화 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult({ items: [], total: 0 }));
    renderPage();

    expect(
      await screen.findByText("조건에 맞는 자재 LOT가 없습니다"),
    ).toBeInTheDocument();
  });

  it("조회 실패 시 오류 상태와 다시 시도를 제공한다", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    renderPage();

    expect(
      await screen.findByText("데이터를 불러오지 못했습니다"),
    ).toBeInTheDocument();

    fetchMock.mockResolvedValue(sampleResult());
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => {
      expect(screen.getByText("ML-2026-0323")).toBeInTheDocument();
    });
  });

  it("가용성 필터 선택은 URL search 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "가용성" }));
    await user.click(await screen.findByRole("option", { name: "가용 부족" }));

    expect(onSearchChange).toHaveBeenCalledWith({ availability: "shortage" });
  });

  it("품질 처분 권한이 있으면 통제 중 LOT에서 처분 행동을 제공한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    render(
      <MaterialLotsPage
        search={{}}
        onSearchChange={vi.fn()}
        onOpenDetail={vi.fn()}
        csrfToken="test-csrf"
        canDecideQuality
      />,
    );

    await screen.findByText("ML-2026-0323");
    expect(
      screen.getAllByRole("button", { name: "품질 처분" }).length,
    ).toBeGreaterThan(0);
  });

  it("LOT 번호를 누르면 상세 화면으로 이동을 요청한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const onOpenDetail = vi.fn();
    render(
      <MaterialLotsPage
        search={{}}
        onSearchChange={vi.fn()}
        onOpenDetail={onOpenDetail}
        csrfToken="test-csrf"
        canDecideQuality={false}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "ML-2026-0323" }));

    expect(onOpenDetail).toHaveBeenCalledWith("lot-1");
  });
});
