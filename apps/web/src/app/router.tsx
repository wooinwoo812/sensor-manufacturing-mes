import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  // Before-load auth checks should run on navigation, not pointer hover/focus.
  defaultPreload: false,
  // Keep the committed screen mounted while navigation checks auth and loads code.
  // Loading feedback belongs to the destination's data region; initial boot is separate.
  defaultPendingMs: Infinity,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
