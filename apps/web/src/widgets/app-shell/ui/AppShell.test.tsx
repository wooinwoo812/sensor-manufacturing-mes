import { render, screen, within, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppShell } from "./AppShell";

vi.mock("./RoleOnboarding", () => ({
  RoleOnboarding: () => (
    <button aria-label="역할별 사용 안내">사용 안내</button>
  ),
}));

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
      csrfToken="csrf-token"
      currentRole="최고관리자"
      navigation={[
        {
          label: "운영",
          items: [{ label: "대시보드", icon: "dashboard", to: "/dashboard" }],
        },
      ]}
      pageTitle="운영 대시보드"
      pathname="/dashboard"
      onSignedOut={() => undefined}
    >
      본문
    </AppShell>,
  );

  expect(screen.getByRole("link", { name: "업무 가이드" })).toHaveAttribute(
    "href",
    "/guide",
  );
  expect(screen.getByText("운영 대시보드")).toBeInTheDocument();
  expect(
    within(screen.getByRole("banner")).queryByRole("link", {
      name: "업무 가이드",
    }),
  ).not.toBeInTheDocument();
  expect(
    within(screen.getByRole("navigation", { name: "업무 안내" })).getByRole(
      "link",
      { name: "업무 가이드" },
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(/마지막 갱신/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "테마 변경" })).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /FabriScope MES/ }),
  ).toBeInTheDocument();
  expect(screen.queryByText("SCR-01A")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /LOT·작업지시 검색/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "알림" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "역할 전환" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "워크스페이스 전환" }),
  ).not.toBeInTheDocument();
});

test("역할별 사용 안내와 중복되는 상시 업무 안내 박스를 표시하지 않는다", async () => {
  const { container } = render(
    <AppShell
      csrfToken="test"
      currentRole="생산계획 담당자"
      navigation={[]}
      onSignedOut={() => undefined}
      pathname="/work-orders"
      pageTitle="작업지시"
      onboarding={{
        userId: "planner",
        roleCode: "PRODUCTION_PLANNER",
        permissions: [],
      }}
    >
      <main>
        <h1>작업지시</h1>
        <input aria-label="검색" />
      </main>
    </AppShell>,
  );
  await waitFor(() =>
    expect(
      container.querySelector('[data-startup-ready="true"]'),
    ).not.toBeNull(),
  );
  expect(
    screen.getByRole("button", { name: "역할별 사용 안내" }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("내 업무 시작 안내")).not.toBeInTheDocument();
  expect(
    screen.queryByText("처음이라면 이렇게 확인하세요"),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "작업지시" })).toBeInTheDocument();
});
