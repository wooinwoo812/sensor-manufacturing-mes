import type { AnchorHTMLAttributes } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider, SidebarInset } from "@/shared/ui";
import { Header } from "./Header";
import { AppSidebar } from "./AppSidebar";
import type { NavigationItem } from "../model/navigation";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props} />
  ),
}));
vi.mock("./NavGroup", () => ({ NavGroup: () => null }));
vi.mock("./NavUser", () => ({ NavUser: () => null }));
afterEach(() => vi.unstubAllGlobals());

function fixture(home: NonNullable<NavigationItem["to"]> = "/execution/queue") {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        csrfToken="test"
        currentRole="현장 작업자"
        navigation={[
          {
            label: "업무",
            items: [
              {
                label: "준비 중",
                to: "/dashboard",
                pending: true,
                icon: "dashboard",
              },
              { label: "첫 업무", to: home, icon: "execution" },
            ],
          },
        ]}
        onSignedOut={() => undefined}
        pathname={home}
      />
      <SidebarInset>
        <Header>현재 업무</Header>
      </SidebarInset>
    </SidebarProvider>
  );
}
it("메뉴 상태에 따라 토글 이름과 펼침 상태가 함께 바뀐다", () => {
  render(fixture());
  const toggle = screen.getByRole("button", {
    name: "업무 메뉴 접기",
  });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(toggle.parentElement).toHaveClass("w-full");
  expect(toggle.parentElement).not.toHaveClass("mx-auto", "max-w-[1400px]");
  fireEvent.click(toggle);
  expect(
    screen.getByRole("button", { name: "업무 메뉴 펼치기" }),
  ).toHaveAttribute("aria-expanded", "false");
});
it.each([
  "/work-orders",
  "/execution/queue",
  "/materials/lots",
  "/quality/inspections",
  "/dashboard",
] as const)(
  "로고는 준비 중 메뉴를 건너뛰고 허용된 첫 화면 %s로 연결한다",
  (home) => {
    render(fixture(home));
    expect(
      screen.getByRole("link", { name: /FabriScope MES/ }),
    ).toHaveAttribute("href", home);
  },
);
it("모바일 메뉴의 보이는 닫기 버튼은 메뉴를 닫고 토글로 초점을 돌린다", async () => {
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
  render(fixture());
  const toggle = screen.getByRole("button", {
    name: "업무 메뉴 열기",
  });
  await user.click(toggle);
  const dialog = await screen.findByRole("dialog", { name: "업무 메뉴" });
  await user.click(
    within(dialog).getByRole("button", { name: "업무 메뉴 닫기" }),
  );
  expect(
    screen.queryByRole("dialog", { name: "업무 메뉴" }),
  ).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
  expect(toggle).toHaveAttribute("aria-expanded", "false");
});
