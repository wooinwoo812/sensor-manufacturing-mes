import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fetchMaterialLots } from "@/entities/material-lot";
import {
  fetchMaterialReservations,
  releaseMaterialAllocation,
  reserveMaterial,
} from "../api/material-reservations";
import { MaterialReservationPanel } from "./MaterialReservationPanel";

vi.mock("@/entities/material-lot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/material-lot")>();
  return { ...actual, fetchMaterialLots: vi.fn() };
});

vi.mock("../api/material-reservations", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/material-reservations")>();
  return {
    ...actual,
    fetchMaterialReservations: vi.fn(),
    reserveMaterial: vi.fn(),
    releaseMaterialAllocation: vi.fn(),
  };
});

const reservationsMock = vi.mocked(fetchMaterialReservations);
const lotsMock = vi.mocked(fetchMaterialLots);
const reserveMock = vi.mocked(reserveMaterial);
const releaseMock = vi.mocked(releaseMaterialAllocation);

function renderPanel(overrides: { canReserve?: boolean; canRelease?: boolean } = {}) {
  render(
    <MaterialReservationPanel
      workOrderId="wo-1"
      orderNumber="WO-2026-092"
      csrfToken="csrf"
      canReserve={overrides.canReserve ?? true}
      canRelease={overrides.canRelease ?? true}
      isReleased
    />,
  );
}

describe("MaterialReservationPanel", () => {
  it("활성 예약과 해제 행동을 표시한다", async () => {
    reservationsMock.mockResolvedValue([
      {
        id: "alloc-1",
        lotNumber: "ML-2026-0301",
        materialCode: "SEN-MAT-014",
        materialName: "적외선 감지 다이오드 어레이",
        unit: "EA",
        quantity: 50,
        status: "ACTIVE",
        closedReason: null,
        createdAt: "2026-09-03T01:00:00.000Z",
      },
    ]);
    lotsMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    renderPanel();

    expect(await screen.findByText("ML-2026-0301")).toBeInTheDocument();
    expect(screen.getByText("활성")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "해제" })).toBeInTheDocument();
  });

  it("예약 폼에서 가용 LOT과 수량을 검증해 전송한다", async () => {
    reservationsMock.mockResolvedValue([]);
    lotsMock.mockResolvedValue({
      items: [
        {
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
          expiresAt: null,
          receivedAt: "2026-08-14T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    reserveMock.mockResolvedValue([]);
    renderPanel();

    await screen.findByText(/적외선 감지 다이오드 어레이 ML-2026-0301/);
    await userEvent.clear(screen.getByRole("spinbutton"));
    await userEvent.type(screen.getByRole("spinbutton"), "30");
    await userEvent.click(screen.getByRole("button", { name: "예약" }));

    await waitFor(() => {
      expect(reserveMock).toHaveBeenCalledWith(
        "wo-1",
        { materialLotId: "lot-1", quantity: 30 },
        "csrf",
      );
    });
  });

  it("예약 권한이 없으면 필요한 권한을 설명한다", async () => {
    reservationsMock.mockResolvedValue([]);
    renderPanel({ canReserve: false, canRelease: false });

    expect(
      await screen.findByText(/예약·해제는 자재 담당자가 처리합니다/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "예약" })).not.toBeInTheDocument();
  });

  it("해제는 command를 호출하고 목록을 갱신한다", async () => {
    reservationsMock.mockResolvedValue([
      {
        id: "alloc-1",
        lotNumber: "ML-2026-0301",
        materialCode: "SEN-MAT-014",
        materialName: "적외선 감지 다이오드 어레이",
        unit: "EA",
        quantity: 50,
        status: "ACTIVE",
        closedReason: null,
        createdAt: "2026-09-03T01:00:00.000Z",
      },
    ]);
    releaseMock.mockResolvedValue([]);
    lotsMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    renderPanel();

    await screen.findByText("ML-2026-0301");
    await userEvent.click(screen.getByRole("button", { name: "해제" }));

    await waitFor(() => {
      expect(releaseMock).toHaveBeenCalledWith("alloc-1", "csrf");
    });
  });
});
