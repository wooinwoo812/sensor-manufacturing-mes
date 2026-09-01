import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/shared/lib";
import { Sidebar, SidebarProvider } from "@/shared/ui";
import { LayoutProvider, useLayout } from "../model/layout-context";
import { LayoutSettings } from "./LayoutSettings";

function LayoutProbe() {
  const { collapsible, variant } = useLayout();

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      사이드바
    </Sidebar>
  );
}

afterEach(() => {
  document.cookie = "layout_collapsible_base=; path=/; max-age=0";
  document.cookie = "layout_variant_base=; path=/; max-age=0";
  document.cookie = "layout-settings-theme=; path=/; max-age=0";
  document.documentElement.classList.remove("light", "dark");
});

test("설정 패널에서 사이드바 형태와 접기 방식을 변경한다", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <ThemeProvider defaultTheme="light" storageKey="layout-settings-theme">
      <LayoutProvider>
        <SidebarProvider defaultOpen>
          <LayoutSettings />
          <LayoutProbe />
        </SidebarProvider>
      </LayoutProvider>
    </ThemeProvider>,
  );

  await user.click(screen.getByRole("button", { name: "화면 설정" }));
  await user.click(screen.getByRole("radio", { name: "플로팅" }));
  await user.click(screen.getByRole("radio", { name: "아이콘" }));

  const sidebar = container.querySelector('[data-slot="sidebar"]');
  expect(sidebar).toHaveAttribute("data-variant", "floating");
  expect(sidebar).toHaveAttribute("data-collapsible", "icon");
  expect(document.cookie).toContain("layout_variant_base=floating");
  expect(document.cookie).toContain("layout_collapsible_base=icon");
});
