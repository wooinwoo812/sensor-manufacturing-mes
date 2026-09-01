import { createFileRoute, notFound } from "@tanstack/react-router";
import { UiKitPage } from "@/pages/ui-kit";

export const Route = createFileRoute("/_authenticated/dev/ui-kit")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
  component: UiKitPage,
});
