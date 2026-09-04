import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fetchMaterialLot, type MaterialLotDetail } from "@/entities/material-lot";
import { MaterialLotDetailPage } from "./MaterialLotDetailPage";

vi.mock("@/entities/material-lot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/material-lot")>();
  return { ...actual, fetchMaterialLot: vi.fn() };
});

const fetchMock = vi.mocked(fetchMaterialLot);

function sampleDetail(
  overrides: Partial<MaterialLotDetail> = {},
): MaterialLotDetail {
  return {
    id: "lot-1",
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
    expiresAt: "2026-10-19T00:00:00.000Z",
    receivedAt: "2026-08-14T00:00:00.000Z",
    allocations: [
      {
        id: "allocation-1",
        workOrderNumber: "WO-2026-091",
        quantity: 120,
        status: "ACTIVE",
        closedReason: null,
        createdAt: "2026-09-01T02:00:00.000Z",
      },
    ],
    recentAudits: [
      {
        id: "audit-1",
        occurredAt: "2026-08-31T05:00:00.000Z",
        actorName: "품질 데모",
        actorRole: "QUALITY_ENGINEER",
        action: "MATERIAL_LOT_DISPOSITION_DECIDED",
        summary: "적외선 감지 다이오드 어레이 ML-2026-0301 품질 처분 결정 대기 → 합격",
      },
    ],
    ...overrides,
  };
}

function renderPage(materialLotId = "lot-1") {
  const onBack = vi.fn();
  render(
    <MaterialLotDetailPage materialLotId={materialLotId} onBack={onBack} />,
  );
  return { onBack };
}

describe("MaterialLotDetailPage", () => {
  it("자재 LOT 수량 요약·예약·감사 이력을 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    renderPage();

    expect(await screen.findByText("ML-2026-0301")).toBeInTheDocument();
    expect(
      screen.getByText("적외선 감지 다이오드 어레이 (SEN-MAT-014)"),
    ).toBeInTheDocument();
    expect(screen.getByText("허입")).toBeInTheDocument();
    expect(screen.getByText("WO-2026-091")).toBeInTheDocument();
    expect(screen.getByText(/품질 처분 결정 대기 → 합격/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "수량 요약" }),
    ).toBeInTheDocument();
  });

  it("가용이 0이면 경고 배지로 표시한다", async () => {
    fetchMock.mockResolvedValue(
      sampleDetail({
        qualityDisposition: "QUARANTINED",
        availableQuantity: 0,
        expiresAt: null,
      }),
    );
    renderPage();

    expect(await screen.findByText("격리")).toBeInTheDocument();
    expect(screen.getByText("0 EA")).toBeInTheDocument();
    expect(
      screen.getByText(
        "현재 품질 상태에서는 신규 예약과 실제 투입이 차단됩니다. 기존 예약은 유지되며 투입 시점에 다시 검증합니다.",
      ),
    ).toBeInTheDocument();
  });

  it("조회 실패 시 다시 시도로 복구한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    renderPage();

    expect(
      await screen.findByText("데이터를 불러오지 못했습니다"),
    ).toBeInTheDocument();

    fetchMock.mockResolvedValue(sampleDetail());
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => {
      expect(screen.getByText("ML-2026-0301")).toBeInTheDocument();
    });
  });

  it("오류 화면에서 목록으로 돌아갈 수 있다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    fetchMock.mockRejectedValue(new Error("network"));
    const { onBack } = renderPage();

    await screen.findByText("데이터를 불러오지 못했습니다");
    await user.click(screen.getByRole("button", { name: "목록으로" }));

    expect(onBack).toHaveBeenCalled();
  });

  it("예약이 없으면 안내를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail({ allocations: [] }));
    renderPage();

    expect(
      await screen.findByText("이 LOT에 대한 예약이 없습니다."),
    ).toBeInTheDocument();
  });
});
