import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppShell } from "./AppShell";

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

test("실제 기능이 없는 전역 조작과 내부 화면 ID를 노출하지 않는다", () => {
  render(
    <AppShell
      currentRole="시스템 관리자"
      navigation={[
        {
          label: "운영",
          items: [
            { label: "대시보드", icon: "dashboard", to: "/dashboard" },
          ],
        },
      ]}
      pageTitle="운영 대시보드"
      pathname="/dashboard"
    >
      본문
    </AppShell>,
  );

  expect(screen.getByText("운영 대시보드")).toBeInTheDocument();
  expect(screen.queryByText(/마지막 갱신/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "테마 변경" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /FabriScope MES/ })).toBeInTheDocument();
  expect(screen.queryByText("SCR-01A")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /LOT·작업지시 검색/ }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "알림" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "워크스페이스 전환" }),
  ).not.toBeInTheDocument();
});
