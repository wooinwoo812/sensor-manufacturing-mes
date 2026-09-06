import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/shared/ui";
import { AppSidebar } from "./AppSidebar";

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

describe("shadcn-admin 기반 MES 앱 사이드바", () => {
  it.each(["/guide"])(
    "keeps the utility destination %s active outside the account footer",
    (pathname) => {
      const { container } = render(
        <SidebarProvider>
          <AppSidebar
            csrfToken="test"
            currentRole="현장 작업자"
            navigation={[]}
            pathname={pathname}
            onSignedOut={() => undefined}
          />
        </SidebarProvider>,
      );
      const support = screen.getByRole("navigation", {
        name: "업무 안내",
      });
      expect(
        within(support).getByRole("link", { current: "page" }),
      ).toHaveAttribute("href", pathname);
      expect(support.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
      expect(within(support).getAllByRole("link")).toHaveLength(1);
      expect(screen.queryByText("현재 역할")).not.toBeInTheDocument();
      expect(screen.queryByText("UI 시스템 점검")).not.toBeInTheDocument();
      expect(container.querySelector('[data-sidebar="footer"] a')).toBeNull();
      expect(
        screen.getByRole("button", { name: "역할 전환" }),
      ).toBeInTheDocument();
    },
  );
  it("MES 기본 레이아웃과 구현 예정 메뉴 상태를 함께 표시한다", () => {
    const { container } = render(
      <SidebarProvider defaultOpen>
        <AppSidebar
          csrfToken="csrf-token"
          currentRole="최고관리자"
          navigation={[
            {
              label: "생산",
              items: [
                {
                  label: "작업지시",
                  icon: "work-order",
                  pending: true,
                },
              ],
            },
          ]}
          pathname="/dashboard"
          onSignedOut={() => undefined}
        />
        <SidebarInset>본문</SidebarInset>
      </SidebarProvider>,
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    // 업무 본문과 분리된 표준 sidebar variant를 유지한다.
    expect(sidebar).toHaveAttribute("data-variant", "sidebar");
    expect(sidebar).toHaveAttribute("data-collapsible", "");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-collapsible", "icon");
    expect(
      screen.getByRole("navigation", { name: "주요 업무영역" }),
    ).toBeInTheDocument();
    expect(screen.getByText("생산")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "작업지시, 구현 예정" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "역할 전환" }),
    ).toBeInTheDocument();
    const support = screen.getByRole("navigation", {
      name: "업무 안내",
    });
    expect(
      within(support).getByRole("link", { name: "업무 가이드" }),
    ).toHaveAttribute("href", "/guide");
    expect(
      within(support).queryByRole("link", { name: /개발 전용/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "현재 역할: 최고관리자" }),
    ).not.toBeInTheDocument();
  });
});
