import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { ToastRegion } from "@/shared/ui";
import { UiKitPage } from "./UiKitPage";

test("UI showcase 기본 상태에 자동 접근성 위반이 없다", async () => {
  const { container } = render(
    <ToastRegion>
      <UiKitPage />
    </ToastRegion>,
  );

  expect(screen.getByTestId("ui-kit-page")).toHaveAttribute(
    "id",
    "main-content",
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "UI 시스템 점검" }),
  ).toBeInTheDocument();

  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
    },
  });

  expect(results.violations).toEqual([]);
});
