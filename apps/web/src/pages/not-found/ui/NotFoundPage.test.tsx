import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { NotFoundPage } from "./NotFoundPage";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

test("없는 route는 공통 상태 문법과 안전한 시작 경로를 제공한다", () => {
  render(<NotFoundPage />);

  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "요청한 화면을 찾을 수 없습니다",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "운영 대시보드로 이동" }),
  ).toHaveAttribute("href", "/dashboard");
});
