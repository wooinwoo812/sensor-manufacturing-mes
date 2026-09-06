import { render, screen, within } from "@testing-library/react";
import { ManufacturingStatusSummary } from "./ManufacturingStatusSummary";

test("생산·검사·품질 상태를 독립된 세 축으로 표시한다", () => {
  render(
    <ManufacturingStatusSummary
      production="completed"
      inspection="pass"
      disposition="QUARANTINED"
    />,
  );

  const summary = screen.getByRole("group", { name: "제조 상태 요약" });
  expect(within(summary).getByText("생산 진행")).toBeInTheDocument();
  expect(within(summary).getByText("완료")).toBeInTheDocument();
  expect(within(summary).getByText("최근 검사")).toBeInTheDocument();
  expect(within(summary).getByText("합격")).toBeInTheDocument();
  expect(within(summary).getByText("현재 품질")).toBeInTheDocument();
  expect(within(summary).getByText("격리")).toBeInTheDocument();
});
