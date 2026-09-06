import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchQualityIncidents,
  type QualityIncidentListResult,
} from "@/entities/quality-incident";
import { IncidentsPage } from "./IncidentsPage";
import type { IncidentsSearch } from "../model/incidents-search";

vi.mock("@/entities/quality-incident", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/entities/quality-incident")>();
  return { ...actual, fetchQualityIncidents: vi.fn() };
});

const fetchMock = vi.mocked(fetchQualityIncidents);

function sampleResult(
  overrides: Partial<QualityIncidentListResult> = {},
): QualityIncidentListResult {
  return {
    items: [
      {
        id: "incident-1",
        incidentNumber: "QI-2026-0701",
        title: "TE 쿨링 모듈 열전달 성능 편차 의심",
        sourceType: "MATERIAL_LOT",
        sourceLotNumber: "ML-2026-0323",
        description: "동일 LOT 전량 사용 중단 후 격리 조사 중.",
        status: "OPEN",
        detectedAt: "2026-09-03T05:00:00.000Z",
        resolvedAt: null,
        createdAt: "2026-09-03T05:30:00.000Z",
      },
      {
        id: "incident-2",
        incidentNumber: "QI-2026-0651",
        title: "신호 커넥터 접점 불량 사후 발견",
        sourceType: "MATERIAL_LOT",
        sourceLotNumber: "ML-2026-0332",
        description: null,
        status: "CLOSED",
        detectedAt: "2026-08-17T07:00:00.000Z",
        resolvedAt: "2026-08-21T06:00:00.000Z",
        createdAt: "2026-08-17T07:10:00.000Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    ...overrides,
  };
}

function renderPage(
  search: IncidentsSearch = {},
  options: { canRegister?: boolean } = {},
) {
  const onSearchChange = vi.fn();
  render(
    <IncidentsPage
      search={search}
      onSearchChange={onSearchChange}
      onOpenDetail={vi.fn()}
      csrfToken="test-csrf"
      canRegister={options.canRegister ?? false}
    />,
  );
  return { onSearchChange };
}

describe("IncidentsPage", () => {
  it("부적합 사건 목록을 핵심 열과 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(await screen.findByText("QI-2026-0701")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText(
        "TE 쿨링 모듈 열전달 성능 편차 의심",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("ML-2026-0323"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("조사 중"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("종결"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "부적합 사건 목록" }),
    ).toBeInTheDocument();
  });

  it("조회 결과가 없으면 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult({ items: [], total: 0 }));
    renderPage();

    expect(
      await screen.findByText("부적합 사건이 없습니다"),
    ).toBeInTheDocument();
  });

  it("상태 필터 선택은 URL search 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "상태" }));
    await user.click(await screen.findByRole("option", { name: "조사 중" }));
    expect(onSearchChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "조회" }));

    expect(onSearchChange).toHaveBeenCalledWith({ status: ["OPEN"] });
  });

  it("등록 권한이 있으면 사건 등록 패널을 열 수 있다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    renderPage({}, { canRegister: true });

    const opener = screen.getByRole("button", { name: "사건 등록" });
    await user.click(opener);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("button", { name: "사건 등록" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("사건 제목")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("등록 권한이 없으면 사건 등록 버튼을 표시하지 않는다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage({}, { canRegister: false });

    await screen.findByText("QI-2026-0701");
    expect(
      screen.queryByRole("button", { name: "사건 등록" }),
    ).not.toBeInTheDocument();
  });
});
