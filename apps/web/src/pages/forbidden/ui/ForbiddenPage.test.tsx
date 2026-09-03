import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ForbiddenPage } from "./ForbiddenPage";

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

test("권한 오류 route도 skip link 대상과 복구 행동을 제공한다", () => {
  render(<ForbiddenPage />);

  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "이 화면을 볼 권한이 없습니다",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "운영 대시보드로 이동" }),
  ).toHaveAttribute("href", "/dashboard");
});
