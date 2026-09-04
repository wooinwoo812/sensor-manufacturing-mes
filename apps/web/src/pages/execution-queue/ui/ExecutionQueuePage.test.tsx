import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchProcessExecutions,
  type ProcessExecutionListResult,
} from "@/entities/process-execution";
import { ExecutionQueuePage } from "./ExecutionQueuePage";

vi.mock("@/entities/process-execution", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/entities/process-execution")>();
  return {
    ...actual,
    fetchProcessExecutions: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchProcessExecutions);

function sampleResult(overrides: Partial<ProcessExecutionListResult> = {}): ProcessExecutionListResult {
  return {
    items: [
      {
        id: "step-1",
        workOrderNumber: "WO-2026-092",
        productCode: "SEN-XR-1280",
        productName: "X선 검출기 패널 1280px",
        plannedQuantity: 40,
        unit: "EA",
        dueDate: "2026-09-02T08:00:00.000Z",
        sequence: 10,
        processStepName: "절단 1공정",
        productionLotNumber: "PL-2026-092A",
        readiness: "BLOCKED",
        blockedReasonCodes: ["MATERIAL_SHORTAGE"],
      },
      {
        id: "step-2",
        workOrderNumber: "WO-2026-094",
        productCode: "SEN-IR-640",
        productName: "적외선 센서 모듈 640px",
        plannedQuantity: 80,
        unit: "EA",
        dueDate: "2026-09-03T03:00:00.000Z",
        sequence: 40,
        processStepName: "최종 검사",
        productionLotNumber: "PL-2026-094A",
        readiness: "READY",
        blockedReasonCodes: [],
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
    <ExecutionQueuePage
      search={{}}
      onSearchChange={onSearchChange}
      csrfToken={"csrf"}
      canExecute
    />,
  );
  return { onSearchChange };
}

describe("ExecutionQueuePage", () => {
  it("대기열을 대상 식별자·공정·준비 상태와 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(await screen.findByText("PL-2026-092A")).toBeInTheDocument();
    expect(screen.getByText("절단 1공정")).toBeInTheDocument();
    expect(screen.getByText("차단")).toBeInTheDocument();
    expect(screen.getByText("자재 부족")).toBeInTheDocument();
    expect(screen.getByText("실행 가능")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "공정 실행 대기열" }),
    ).toBeInTheDocument();
  });

  it("조회 결과가 없으면 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult({ items: [], total: 0 }));
    renderPage();

    expect(
      await screen.findByText("조건에 맞는 공정이 없습니다"),
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
      expect(screen.getByText("PL-2026-092A")).toBeInTheDocument();
    });
  });

  it("준비 상태 필터는 URL search 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "준비 상태" }));
    await user.click(await screen.findByRole("option", { name: "실행 가능" }));

    expect(onSearchChange).toHaveBeenCalledWith({ readiness: "ready" });
  });
});
