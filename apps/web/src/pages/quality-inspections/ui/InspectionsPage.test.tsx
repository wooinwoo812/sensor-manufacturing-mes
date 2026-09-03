import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchInspections,
  type InspectionListResult,
} from "@/entities/inspection";
import { InspectionsPage } from "./InspectionsPage";

vi.mock("@/entities/inspection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/inspection")>();
  return {
    ...actual,
    fetchInspections: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchInspections);

function sampleResult(overrides: Partial<InspectionListResult> = {}): InspectionListResult {
  return {
    items: [
      {
        id: "inspection-1",
        inspectionNumber: "INSP-2026-0101",
        workOrderNumber: "WO-2026-091",
        productCode: "SEN-IR-640",
        productName: "적외선 센서 모듈 640px",
        productionLotNumber: "PL-2026-091A",
        processStepName: "최종 검사",
        gate: "LOT_COMPLETE",
        specName: "적외선 모듈 최종검사 규격 v3",
        executionStatus: "PENDING",
        verdict: null,
        completedAt: null,
        createdAt: "2026-09-01T01:00:00.000Z",
      },
      {
        id: "inspection-2",
        inspectionNumber: "INSP-2026-0107",
        workOrderNumber: "WO-2026-094",
        productCode: "SEN-IR-640",
        productName: "적외선 센서 모듈 640px",
        productionLotNumber: "PL-2026-094A",
        processStepName: "조립 2공정",
        gate: "ROUTE_ADVANCE",
        specName: "조립 정밀도 검사 규격 v2",
        executionStatus: "COMPLETED",
        verdict: "FAIL",
        completedAt: "2026-09-02T05:00:00.000Z",
        createdAt: "2026-09-01T02:00:00.000Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    ...overrides,
  };
}

function renderPage() {
  const onSearchChange = vi.fn();
  render(
    <InspectionsPage
      search={{}}
      onSearchChange={onSearchChange}
      csrfToken={"csrf"}
      canVerdict
    />,
  );
  return { onSearchChange };
}

describe("InspectionsPage", () => {
  it("검사 목록을 게이트·상태·판정과 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(await screen.findByText("INSP-2026-0101")).toBeInTheDocument();
    expect(screen.getByText("LOT 완료")).toBeInTheDocument();
    expect(screen.getByText("미판정")).toBeInTheDocument();
    expect(screen.getByText("불합격")).toBeInTheDocument();
    expect(screen.getByText("적외선 모듈 최종검사 규격 v3")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "품질 검사 목록" }),
    ).toBeInTheDocument();
  });

  it("조회 결과가 없으면 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult({ items: [], total: 0 }));
    renderPage();

    expect(
      await screen.findByText("조건에 맞는 검사가 없습니다"),
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
      expect(screen.getByText("INSP-2026-0101")).toBeInTheDocument();
    });
  });

  it("판정 필터는 URL search 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "판정" }));
    await user.click(await screen.findByRole("option", { name: "불합격" }));

    expect(onSearchChange).toHaveBeenCalledWith({ verdict: ["FAIL"] });
  });
});
