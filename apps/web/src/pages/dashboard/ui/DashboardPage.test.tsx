import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchDashboardSummary,
  type DashboardSummary,
} from "@/entities/dashboard";
import { DashboardPage } from "./DashboardPage";

vi.mock("@/entities/dashboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/dashboard")>();
  return {
    ...actual,
    fetchDashboardSummary: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchDashboardSummary);

function sampleSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    metrics: {
      workOrders: {
        inProgress: 3,
        released: 2,
        draft: 2,
        completed: 1,
        cancelled: 1,
        overdue: 1,
        blocked: 2,
      },
      productionLots: { distinct: 6, inProgress: 2 },
      inspections: { pending: 3, inProgress: 1, failed: 1, hold: 1 },
      materialLots: { quarantined: 1, shortage: 1, expired: 1 },
    },
    weekly: [
      { weekday: "월", plannedQuantity: 120, progressQuantity: 80 },
      { weekday: "화", plannedQuantity: 40, progressQuantity: 0 },
      { weekday: "수", plannedQuantity: 0, progressQuantity: 0 },
      { weekday: "목", plannedQuantity: 0, progressQuantity: 0 },
      { weekday: "금", plannedQuantity: 80, progressQuantity: 56 },
      { weekday: "토", plannedQuantity: 0, progressQuantity: 0 },
      { weekday: "일", plannedQuantity: 0, progressQuantity: 0 },
    ],
    weeklyTotals: { planned: 240, progress: 136, completionRate: 56.7 },
    attentionQueue: [
      {
        code: "WO-2026-092",
        context: "납기 09/02",
        reason: "작업지시가 차단됐습니다: 자재 LOT 부족",
        status: "차단",
        tone: "danger",
      },
      {
        code: "PL-2026-091A",
        context: "검사 INSP-2026-0101",
        reason: "LOT 완료 게이트 최종검사가 판정을 기다리고 있습니다.",
        status: "검사 대기",
        tone: "warning",
      },
    ],
    ...overrides,
  };
}

describe("DashboardPage", () => {
  it("실데이터 집계로 MES 핵심 현황과 조치 항목을 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleSummary());
    render(<DashboardPage />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "운영 대시보드" }),
    ).toBeInTheDocument();
    expect(screen.getByText("진행 중 작업지시")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { level: 3, name: "이번 주 납기 계획 대비 진행" }),
    ).toBeInTheDocument();
    expect(screen.getByText("56.7%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "주간 생산 달성률 56.7%" }),
    ).toHaveAttribute("aria-valuenow", "56.7");
    expect(
      screen.getByRole("heading", { level: 3, name: "조치 필요" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2건")).toBeInTheDocument();
    expect(screen.getByText("WO-2026-092")).toBeInTheDocument();
    expect(screen.getByText(/갱신$/)).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-detail-grid")).toHaveClass(
      "xl:grid-cols-7",
    );
  });

  it("조회 실패 시 오류 상태와 다시 시도를 제공한다", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    render(<DashboardPage />);

    expect(
      await screen.findByText("데이터를 불러오지 못했습니다"),
    ).toBeInTheDocument();

    fetchMock.mockResolvedValue(sampleSummary());
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => {
      expect(screen.getByText("56.7%")).toBeInTheDocument();
    });
  });

  it("조치 항목이 없으면 안내 상태를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleSummary({ attentionQueue: [] }));
    render(<DashboardPage />);

    expect(
      await screen.findByText("현재 조치가 필요한 항목이 없습니다."),
    ).toBeInTheDocument();
  });
});
