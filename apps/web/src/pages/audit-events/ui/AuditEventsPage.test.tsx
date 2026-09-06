import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchAuditEvents,
  type AuditEventListResult,
} from "@/entities/audit-event";
import { AuditEventsPage } from "./AuditEventsPage";

vi.mock("@/entities/audit-event", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/entities/audit-event")>();
  return {
    ...actual,
    fetchAuditEvents: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchAuditEvents);

function sampleResult(
  overrides: Partial<AuditEventListResult> = {},
): AuditEventListResult {
  return {
    items: [
      {
        id: "audit-1",
        occurredAt: "2026-09-03T01:12:00.000Z",
        actorId: "demo-quality-engineer",
        actorRole: "QUALITY_ENGINEER",
        actorName: "품질 데모",
        action: "INSPECTION_VERDICTED",
        entityType: "INSPECTION",
        entityId: "INSP-2026-0107",
        summary: "조립 정밀도 검사 불합격 판정 (기준 초과 0.02mm)",
        requestId: "req-2026-09-03-0042",
      },
      {
        id: "audit-2",
        occurredAt: "2026-09-02T22:00:00.000Z",
        actorId: "demo-production-planner",
        actorRole: "PRODUCTION_PLANNER",
        actorName: "생산계획 데모",
        action: "WORK_ORDER_RELEASED",
        entityType: "WORK_ORDER",
        entityId: "WO-2026-097",
        summary: "적외선 센서 모듈 100EA 작업지시 발행",
        requestId: "req-2026-09-02-0117",
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
  render(<AuditEventsPage search={{}} onSearchChange={onSearchChange} />);
  return { onSearchChange };
}

describe("AuditEventsPage", () => {
  it("감사 이벤트를 행위자·행동·대상·내용과 함께 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(await screen.findByText("INSP-2026-0107")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("검사 판정"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("품질 담당자"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("req-2026-09-03-0042"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "감사 이벤트 목록" }),
    ).toBeInTheDocument();
  });

  it("조회 결과가 없으면 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult({ items: [], total: 0 }));
    renderPage();

    expect(
      await screen.findByText("조건에 맞는 감사 이벤트가 없습니다"),
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
      expect(screen.getByText("INSP-2026-0107")).toBeInTheDocument();
    });
  });

  it("행위자 역할 필터는 URL search 조건으로 전달한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "행위자 역할" }));
    await user.click(
      await screen.findByRole("option", { name: "생산계획 담당자" }),
    );

    expect(onSearchChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "조회" }));
    expect(onSearchChange).toHaveBeenCalledWith({
      actorRole: ["PRODUCTION_PLANNER"],
    });
  });
});
