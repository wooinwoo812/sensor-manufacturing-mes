import { fireEvent, render, screen } from "@testing-library/react";
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
  it("MES 기본 레이아웃과 구현 예정 메뉴 상태를 함께 표시한다", () => {
    const { container } = render(
      <SidebarProvider defaultOpen>
        <AppSidebar
          csrfToken="csrf-token"
          currentRole="시스템 관리자"
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
          showDevelopmentTools={false}
        />
        <SidebarInset>본문</SidebarInset>
      </SidebarProvider>,
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toHaveAttribute("data-variant", "inset");
    expect(sidebar).toHaveAttribute("data-collapsible", "");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-collapsible", "icon");
    expect(screen.getByRole("navigation", { name: "주요 업무영역" })).toBeInTheDocument();
    expect(screen.getByText("생산")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "작업지시, 구현 예정" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("현재 역할: 시스템 관리자")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "현재 역할: 시스템 관리자" }),
    ).not.toBeInTheDocument();
  });
});
