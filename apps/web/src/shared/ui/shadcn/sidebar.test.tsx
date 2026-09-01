import { fireEvent, render, screen } from "@testing-library/react";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

describe("shadcn-admin 기반 반응형 사이드바", () => {
  it("Ctrl+B로 데스크톱 사이드바를 접고 펼친다", () => {
    const { container } = render(
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarContent>업무 메뉴</SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>,
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });

  it("사이드바 토글에 한글 접근성 이름을 제공한다", () => {
    render(
      <SidebarProvider>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>,
    );

    expect(
      screen.getByRole("button", { name: "업무 메뉴 접기 또는 펼치기" }),
    ).toBeInTheDocument();
  });
});
