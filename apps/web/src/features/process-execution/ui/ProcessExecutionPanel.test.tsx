import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessExecutionPanel } from "./ProcessExecutionPanel";
import { completeProcessStep } from "../api/process-execution-commands";

vi.mock("../api/process-execution-commands", () => ({ completeProcessStep: vi.fn(), startProcessStep: vi.fn() }));

function renderPanel(outputQuantityLimit: number | null = 115) {
  const onDone = vi.fn();
  render(<ProcessExecutionPanel csrfToken="csrf" onDone={onDone} target={{ stepId: "step", workOrderNumber: "WO-1", productionLotNumber: "LOT-A", processStepName: "조립", plannedQuantity: 120, outputQuantityLimit }} />);
  return onDone;
}

describe("process completion quantities", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to the previous process's good quantity and submits a conserved total", async () => {
    vi.mocked(completeProcessStep).mockResolvedValue({ ok: true });
    const onDone = renderPanel();
    expect(screen.getByRole("spinbutton", { name: "양품" })).toHaveValue(115);
    fireEvent.change(screen.getByRole("spinbutton", { name: "양품" }), { target: { value: "110" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "불량" }), { target: { value: "5" } });
    await userEvent.click(screen.getByRole("button", { name: "완료 확정" }));
    expect(completeProcessStep).toHaveBeenCalledWith("step", { goodQuantity: 110, defectQuantity: 5 }, "csrf");
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
  });

  it.each(["116", "114", "-1", "114.5", ""])("blocks invalid or unbalanced quantity %s before sending", (value) => {
    renderPanel();
    fireEvent.change(screen.getByRole("spinbutton", { name: "양품" }), { target: { value } });
    expect(screen.getByRole("button", { name: "완료 확정" })).toBeDisabled();
    expect(completeProcessStep).not.toHaveBeenCalled();
  });

  it("requires the predecessor's recorded quantity", () => {
    renderPanel(null);
    expect(screen.getByText("선행 공정의 완료 실적을 먼저 확인해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "완료 확정" })).toBeDisabled();
  });
});
