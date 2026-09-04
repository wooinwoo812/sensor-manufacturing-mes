import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { decideMaterialLotDisposition } from "../api/material-lot-disposition";
import { MaterialLotDispositionPanel } from "./MaterialLotDispositionPanel";

vi.mock("../api/material-lot-disposition", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../api/material-lot-disposition")>();
  return { ...actual, decideMaterialLotDisposition: vi.fn() };
});

const decideMock = vi.mocked(decideMaterialLotDisposition);

function renderPanel() {
  const onDone = vi.fn();
  render(
    <MaterialLotDispositionPanel
      csrfToken="csrf"
      onDone={onDone}
      target={{
        lotId: "lot-8",
        lotNumber: "ML-2026-0323",
        materialName: "TE 쿨링 모듈",
        currentDisposition: "QUARANTINED",
        onHand: 100,
        unit: "EA",
      }}
    />,
  );
  return { onDone };
}

describe("MaterialLotDispositionPanel", () => {
  it("대상 LOT 정보와 현재 품질 상태를 표시한다", () => {
    renderPanel();

    expect(
      screen.getByText(/TE 쿨링 모듈 · ML-2026-0323/),
    ).toBeInTheDocument();
    expect(screen.getByText("격리")).toBeInTheDocument();
  });

  it("거부·폐기를 선택하면 되돌릴 수 없다는 경고를 표시한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPanel();

    await user.click(screen.getByRole("combobox", { name: "처분" }));
    await user.click(
      await screen.findByRole("option", { name: "거부·폐기 (REJECTED)" }),
    );

    expect(
      await screen.findByText(
        "거부·폐기 처분은 잔여 재고를 폐기 수량으로 이관하며 되돌릴 수 없습니다",
      ),
    ).toBeInTheDocument();
  });

  it("처분 확정은 선택 값과 사유를 전송한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    decideMock.mockResolvedValue({
      ok: true,
      lot: {
        lotId: "lot-8",
        lotNumber: "ML-2026-0323",
        previousDisposition: "QUARANTINED",
        disposition: "REJECTED",
        onHand: 0,
        scrappedQuantity: 100,
        availableQuantityBefore: 0,
        availableQuantityAfter: 0,
      },
    });
    const { onDone } = renderPanel();

    await user.click(screen.getByRole("combobox", { name: "처분" }));
    await user.click(
      await screen.findByRole("option", { name: "거부·폐기 (REJECTED)" }),
    );
    await user.type(screen.getByLabelText("처분 사유"), "재검사 결과 복원 불가");
    await user.click(screen.getByRole("button", { name: "처분 확정" }));

    await waitFor(() => {
      expect(decideMock).toHaveBeenCalledWith(
        "lot-8",
        { disposition: "REJECTED", memo: "재검사 결과 복원 불가" },
        "csrf",
      );
      expect(onDone).toHaveBeenCalled();
    });
  });

  it("처분 실패 시 오류 메시지를 표시한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    decideMock.mockRejectedValue(new Error("conflict"));
    renderPanel();

    await user.click(screen.getByRole("button", { name: "처분 확정" }));

    expect(
      await screen.findByText("품질 처분을 처리하지 못했습니다."),
    ).toBeInTheDocument();
  });
});
