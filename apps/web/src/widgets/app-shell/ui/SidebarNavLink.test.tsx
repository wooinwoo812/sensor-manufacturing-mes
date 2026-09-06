import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@/shared/ui";
import { Header } from "./Header";
import { SidebarNavLink } from "./SidebarNavLink";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    children: ReactNode;
  }) => (
    <a
      href={to}
      {...props}
      onClick={(event) => {
        // The real router intercepts the anchor instead of reloading the document.
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));
beforeEach(() => {
  // jsdom has no ResizeObserver; Radix tooltips may mount while focus is restored.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

it.each([
  ["/work-orders", "/work-orders", true],
  ["/work-orders/WO-001", "/work-orders", true],
  ["/work-orders-archive", "/work-orders", false],
  ["/execution/lots/LOT-001", "/execution/queue", true],
  ["/guide", "/guide", true],
  ["/dev/ui-kit", "/dev/ui-kit", true],
] as const)("marks %s against %s consistently", (pathname, to, active) => {
  render(
    <SidebarProvider>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarNavLink to={to} pathname={pathname} label="메뉴">
            <span>메뉴</span>
          </SidebarNavLink>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarProvider>,
  );
  const link = screen.getByRole("link", { name: "메뉴" });
  expect(link).toHaveAttribute("href", to);
  expect(link).toHaveAttribute("data-active", String(active));
  if (active) expect(link).toHaveAttribute("aria-current", "page");
  else expect(link).not.toHaveAttribute("aria-current");
});

it("keeps the development-only accessible name when its visible label is compact", () => {
  render(
    <SidebarProvider>
      <SidebarNavLink
        to="/dev/ui-kit"
        pathname="/dev/ui-kit"
        label="UI 시스템 점검 · 개발 전용"
        ariaLabel="UI 시스템 점검 · 개발 전용"
      >
        <span>UI 시스템 점검</span>
        <span>개발</span>
      </SidebarNavLink>
    </SidebarProvider>,
  );
  expect(
    screen.getByRole("link", { name: "UI 시스템 점검 · 개발 전용" }),
  ).toHaveAttribute("href", "/dev/ui-kit");
});

it.each(["/work-orders", "/guide", "/dev/ui-kit"] as const)(
  "closes mobile navigation after choosing %s",
  async (to) => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        media: "(width < 64rem)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarNavLink
                to={to}
                pathname="/audit-events"
                label="이동할 메뉴"
              >
                <span>이동할 메뉴</span>
              </SidebarNavLink>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
        <SidebarInset>
          <Header>현재 업무</Header>
        </SidebarInset>
      </SidebarProvider>,
    );
    const toggle = screen.getByRole("button", { name: "업무 메뉴 열기" });
    await user.click(toggle);
    const dialog = await screen.findByRole("dialog", { name: "업무 메뉴" });
    await user.click(within(dialog).getByRole("link", { name: "이동할 메뉴" }));
    expect(
      screen.queryByRole("dialog", { name: "업무 메뉴" }),
    ).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  },
);
