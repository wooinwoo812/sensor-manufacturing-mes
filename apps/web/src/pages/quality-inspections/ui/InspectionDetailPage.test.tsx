import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fetchInspection, type InspectionDetail } from "@/entities/inspection";
import { verdictInspection } from "@/features/inspection-verdict";
import { InspectionDetailPage } from "./InspectionDetailPage";

vi.mock("@/entities/inspection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/inspection")>();
  return { ...actual, fetchInspection: vi.fn() };
});

vi.mock("@/features/inspection-verdict/api/inspection-verdict", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/inspection-verdict/api/inspection-verdict")
    >();
  return { ...actual, verdictInspection: vi.fn() };
});

const fetchMock = vi.mocked(fetchInspection);
const verdictMock = vi.mocked(verdictInspection);

function sampleDetail(
  overrides: Partial<InspectionDetail> = {},
): InspectionDetail {
  return {
    id: "inspection-1",
    inspectionNumber: "INSP-2026-0106",
    workOrderNumber: "WO-2026-092",
    productCode: "SEN-PROD-100",
    productName: "산업용 열화상 센서 모듈",
    productionLotNumber: "PL-2026-092A",
    processStepName: "절단 1공정",
    gate: "ROUTE_ADVANCE",
    specName: "절단 치수 검사 규격 v2",
    executionStatus: "PENDING",
    verdict: null,
    verdictMemo: null,
    completedAt: null,
    createdAt: "2026-09-02T01:00:00.000Z",
    recentAudits: [],
    ...overrides,
  };
}

function renderPage(
  options: { canVerdict?: boolean } = {},
  inspectionId = "inspection-1",
) {
  const onBack = vi.fn();
  render(
    <InspectionDetailPage
      inspectionId={inspectionId}
      csrfToken="csrf"
      canVerdict={options.canVerdict ?? true}
      onBack={onBack}
    />,
  );
  return { onBack };
}

describe("InspectionDetailPage", () => {
  it("검사 개요·규격·대상을 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    renderPage();

    expect(await screen.findByText("INSP-2026-0106")).toBeInTheDocument();
    expect(screen.getByText("절단 치수 검사 규격 v2")).toBeInTheDocument();
    expect(screen.getByText("WO-2026-092")).toBeInTheDocument();
    expect(screen.getAllByText(/PL-2026-092A/).length).toBeGreaterThan(0);
    expect(screen.getByText("미판정")).toBeInTheDocument();
  });

  it("판정 권한이 있고 대기 검사면 판정 패널을 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    renderPage({ canVerdict: true });

    expect(
      await screen.findByRole("button", { name: "판정 확정" }),
    ).toBeInTheDocument();
  });

  it("권한이 없으면 판정 패널을 표시하지 않는다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    renderPage({ canVerdict: false });

    await screen.findByText("INSP-2026-0106");
    expect(
      screen.queryByRole("button", { name: "판정 확정" }),
    ).not.toBeInTheDocument();
  });

  it("완료 검사는 결과와 이력을 표시하고 판정 패널을 제공하지 않는다", async () => {
    fetchMock.mockResolvedValue(
      sampleDetail({
        executionStatus: "COMPLETED",
        verdict: "PASS",
        verdictMemo: "전 항목 기준 내",
        completedAt: "2026-09-01T05:00:00.000Z",
        recentAudits: [
          {
            id: "audit-1",
            occurredAt: "2026-09-01T05:00:00.000Z",
            actorName: "품질 데모",
            actorRole: "QUALITY_ENGINEER",
            action: "INSPECTION_VERDICTED",
            summary: "절단 치수 검사 규격 v2 합격 판정 (PL-2026-092A)",
          },
        ],
      }),
    );
    renderPage({ canVerdict: true });

    expect(await screen.findByText("합격")).toBeInTheDocument();
    expect(screen.getByText("전 항목 기준 내")).toBeInTheDocument();
    expect(screen.getByText(/합격 판정/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "판정 확정" }),
    ).not.toBeInTheDocument();
  });

  it("판정 완료 후 상세를 다시 불러온다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    let current = sampleDetail();
    fetchMock.mockImplementation(async () => current);
    verdictMock.mockResolvedValue({ ok: true });
    renderPage({ canVerdict: true });

    await screen.findByRole("button", { name: "판정 확정" });

    current = sampleDetail({ executionStatus: "COMPLETED", verdict: "PASS" });
    await user.click(screen.getByRole("button", { name: "판정 확정" }));

    await waitFor(() => {
      expect(screen.getByText("합격")).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("조회 실패 시 목록 복귀를 제공한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockRejectedValue(new Error("network"));
    const { onBack } = renderPage();

    expect(
      await screen.findByText(/검사를 불러오지 못했습니다/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "목록으로" }));

    expect(onBack).toHaveBeenCalled();
  });
});
