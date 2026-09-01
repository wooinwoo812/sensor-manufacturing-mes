import { render, screen } from "@testing-library/react";
import { DashboardPage } from "./DashboardPage";

vi.mock("./Overview", () => ({
  Overview: () => <div aria-label="생산 실적 그래프" />,
}));

test("구현되지 않은 조작 대신 MES 핵심 현황과 상태를 우선 표시한다", () => {
  render(<DashboardPage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "운영 대시보드" }),
  ).toBeInTheDocument();
  expect(screen.getByText("진행 중 작업지시")).toBeInTheDocument();
  expect(screen.getAllByText("검사 대기")).toHaveLength(2);
  expect(screen.getByText("격리")).toBeInTheDocument();
  expect(screen.getByText("조치 필요")).toBeInTheDocument();
  expect(screen.getByText("자재 부족")).toBeInTheDocument();
  expect(screen.getByText("82.4%")).toBeInTheDocument();
  expect(
    screen.getByRole("progressbar", { name: "주간 생산 달성률 82.4%" }),
  ).toHaveAttribute("aria-valuenow", "82.4");
  expect(
    screen.getByRole("heading", { level: 3, name: "주간 생산 실적" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 3, name: "조치 필요" }),
  ).toBeInTheDocument();
  expect(screen.getByText("가상 데모 데이터")).toBeInTheDocument();
  expect(screen.getByTestId("dashboard-detail-grid")).toHaveClass(
    "xl:grid-cols-7",
  );
  expect(screen.getByTestId("dashboard-detail-grid")).not.toHaveClass(
    "lg:grid-cols-7",
  );
  expect(screen.queryByText("최근 생산 활동")).not.toBeInTheDocument();
  expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "작업지시 보기" }),
  ).not.toBeInTheDocument();
});
