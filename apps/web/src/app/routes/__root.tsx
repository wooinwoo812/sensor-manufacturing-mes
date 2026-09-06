import { createRootRoute, Outlet } from "@tanstack/react-router";
import { InitialLoading } from "@/app/entrypoint/InitialLoading";
import { NotFoundPage } from "@/pages/not-found";

export const Route = createRootRoute({
  component: Outlet,
  pendingComponent: InitialLoading,
  notFoundComponent: NotFoundPage,
});
