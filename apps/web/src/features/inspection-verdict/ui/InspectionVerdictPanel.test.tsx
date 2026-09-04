import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { verdictInspection } from "../api/inspection-verdict";
import { InspectionVerdictPanel } from "./InspectionVerdictPanel";

vi.mock("../api/inspection-verdict", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../api/inspection-verdict")>();
  return { ...actual, verdictInspection: vi.fn() };
});

const verdictMock = vi.mocked(verdictInspection);

function renderPanel() {
  const onDone = vi.fn();
  render(
    <InspectionVerdictPanel
      csrfToken="csrf"
      onDone={onDone}
      target={{
        inspectionId: "inspection-1",
        inspectionNumber: "INSP-2026-0106",
        specName: "절단 치수 검사 규격 v2",
        productionLotNumber: "PL-2026-092A",
      }}
    />,
  );
  return { onDone };
}

describe("InspectionVerdictPanel", () => {
  it("불합격을 선택하면 품질 처분 경고를 표시한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPanel();

    await user.click(screen.getByRole("combobox", { name: "판정" }));
    await user.click(
      await screen.findByRole("option", { name: "불합격 (FAIL)" }),
    );

    expect(
      await screen.findByText("불합격은 품질 처분 대상이 됩니다"),
    ).toBeInTheDocument();
  });

  it("보류를 선택하면 재측정 경고를 표시한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPanel();

    await user.click(screen.getByRole("combobox", { name: "판정" }));
    await user.click(await screen.findByRole("option", { name: "보류 (HOLD)" }));

    expect(
      await screen.findByText("보류는 재측정 전까지 진행을 막습니다"),
    ).toBeInTheDocument();
  });

  it("판정 확정은 선택 값과 메모를 전송한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    verdictMock.mockResolvedValue({ ok: true });
    const { onDone } = renderPanel();

    await user.click(screen.getByRole("combobox", { name: "판정" }));
    await user.click(
      await screen.findByRole("option", { name: "불합격 (FAIL)" }),
    );
    await user.type(screen.getByLabelText("판정 메모"), "기준 초과 0.05mm");
    await user.click(screen.getByRole("button", { name: "판정 확정" }));

    await waitFor(() => {
      expect(verdictMock).toHaveBeenCalledWith(
        "inspection-1",
        { verdict: "FAIL", memo: "기준 초과 0.05mm" },
        "csrf",
      );
      expect(onDone).toHaveBeenCalled();
    });
  });
});
