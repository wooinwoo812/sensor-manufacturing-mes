import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("1024px 미만에서는 키보드로 overlay 메뉴를 열고 Escape로 닫는다", async () => {
    const user = userEvent.setup();
    const mediaQueryList = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: true,
      media: "(width < 64rem)",
      onchange: null,
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList));

    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>업무 메뉴 항목</SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: "업무 메뉴 접기 또는 펼치기",
    });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("dialog", { name: "업무 메뉴" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "업무 메뉴" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    vi.unstubAllGlobals();
  });
});
