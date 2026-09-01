import { render, screen } from "@testing-library/react";
import { AppErrorBoundary } from "./AppErrorBoundary";

function BrokenView(): never {
  throw new Error("render failed");
}

test("렌더링 실패를 공통 오류 상태와 복구 행동으로 격리한다", () => {
  const consoleError = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  render(
    <AppErrorBoundary>
      <BrokenView />
    </AppErrorBoundary>,
  );

  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "화면을 표시하지 못했습니다",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "화면 새로고침" }),
  ).toBeInTheDocument();

  consoleError.mockRestore();
});
