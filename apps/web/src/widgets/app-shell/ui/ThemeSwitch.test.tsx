import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/shared/lib";
import { ThemeSwitch } from "./ThemeSwitch";

afterEach(() => {
  document.documentElement.classList.remove("light", "dark");
  document.cookie = "theme-switch-test=; path=/; max-age=0";
});

test("다크 테마를 선택하고 cookie에 저장한다", async () => {
  const user = userEvent.setup();
  const themeColor = document.createElement("meta");
  themeColor.name = "theme-color";
  document.head.append(themeColor);

  render(
    <ThemeProvider defaultTheme="light" storageKey="theme-switch-test">
      <ThemeSwitch />
    </ThemeProvider>,
  );

  await user.click(screen.getByRole("button", { name: "테마 변경" }));
  await user.click(screen.getByRole("menuitem", { name: "다크" }));

  await waitFor(() => {
    expect(document.documentElement).toHaveClass("dark");
  });
  expect(document.cookie).toContain("theme-switch-test=dark");
  expect(themeColor).toHaveAttribute("content", "#020617");
  themeColor.remove();
});
