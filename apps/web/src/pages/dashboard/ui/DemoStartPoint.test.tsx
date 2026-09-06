import { fireEvent, render, screen } from "@testing-library/react";
import { DemoStartPoint } from "./DemoStartPoint";

const reviewed = { id: "reviewed-id", scenario: "REVIEWED", hasHeldInspection: false, orderNumber: "WO-REVIEWED", label: "검토 사례", status: "COMPLETED", progressPercent: 100, blockedReason: null };
const held = { id: "held-id", scenario: "HOLD", hasHeldInspection: true, orderNumber: "WO-HELD", label: "보류 사례", status: "IN_PROGRESS", progressPercent: 60, blockedReason: "검사 보류" };

it("opens the currently held order even when the completed example comes first", () => {
  const onOpen = vi.fn();
  render(<DemoStartPoint cases={[reviewed, held]} onOpen={onOpen} />);
  expect(screen.getByRole("heading", { name: "검사 보류로 멈춘 작업" })).toBeInTheDocument();
  expect(screen.getByText("WO-HELD")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "작업 확인" }));
  expect(onOpen).toHaveBeenCalledExactlyOnceWith("held-id");
});

it("uses completed review history after the HOLD has been resolved", () => {
  const onOpen = vi.fn();
  render(<DemoStartPoint cases={[{ ...held, hasHeldInspection: false, blockedReason: null }, reviewed]} onOpen={onOpen} />);
  expect(screen.getByRole("heading", { name: "보류 검토 후 완료된 작업" })).toBeInTheDocument();
  expect(screen.queryByText("WO-HELD")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "작업 확인" }));
  expect(onOpen).toHaveBeenCalledExactlyOnceWith("reviewed-id");
});

it("does not offer a dead link when representative records are missing or cancelled", () => {
  const { rerender } = render(<DemoStartPoint cases={[]} onOpen={vi.fn()} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  rerender(<DemoStartPoint cases={[{ ...held, status: "CANCELLED" }]} onOpen={vi.fn()} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
