import { createFileRoute } from "@tanstack/react-router";
import { UiKitPage } from "@/pages/ui-kit";

export const Route = createFileRoute("/_authenticated/dev/ui-kit")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw new Error("UI showcase는 개발 환경에서만 사용할 수 있습니다.");
    }
  },
  component: UiKitPage,
});
