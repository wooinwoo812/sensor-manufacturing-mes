import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarInset, SidebarProvider } from "@/shared/ui";
import { LayoutProvider } from "../model/layout-context";
import { AppSidebar } from "./AppSidebar";

describe("shadcn-admin 기반 MES 앱 사이드바", () => {
  it("MES 기본 레이아웃과 구현 예정 메뉴 상태를 함께 표시한다", () => {
    const { container } = render(
      <LayoutProvider>
        <SidebarProvider defaultOpen>
          <AppSidebar
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
            showDevelopmentTools={false}
          />
          <SidebarInset>본문</SidebarInset>
        </SidebarProvider>
      </LayoutProvider>,
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toHaveAttribute("data-variant", "sidebar");
    expect(sidebar).toHaveAttribute("data-collapsible", "");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-collapsible", "icon");
    expect(screen.getByRole("navigation", { name: "주요 업무영역" })).toBeInTheDocument();
    expect(screen.getByText("생산")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "작업지시, 구현 예정" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "현재 역할: 시스템 관리자" }),
    ).toBeInTheDocument();
  });
});
