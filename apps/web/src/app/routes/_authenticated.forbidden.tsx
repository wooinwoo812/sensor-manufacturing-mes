import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenPage } from "@/pages/forbidden";

export const Route = createFileRoute("/_authenticated/forbidden")({
  component: ForbiddenPage,
});
