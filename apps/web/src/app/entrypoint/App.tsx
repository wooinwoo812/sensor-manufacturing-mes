import { RouterProvider, useRouterState } from "@tanstack/react-router";
import { ThemeProvider } from "@/shared/lib";
import { ToastRegion } from "@/shared/ui";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { router } from "../router";
import { InitialLoading } from "./InitialLoading";
import { LoaderCircle } from "lucide-react";

function AppRouter() {
  const hasMatches = useRouterState({
    router,
    select: (state) => state.matches.length > 0,
  });
  const isNavigating = useRouterState({
    router,
    select: (state) => state.isLoading,
  });
  return (
    <>
      {!hasMatches ? <InitialLoading /> : null}
      <RouterProvider router={router} />
      {hasMatches && isNavigating ? (
        <div
          data-navigation-loading
          role="status"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-panel border border-border bg-surface px-4 py-3 text-sm text-text shadow-panel"
        >
          <LoaderCircle
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          화면 이동 중입니다.
        </div>
      ) : null}
    </>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <ToastRegion>
          <AppRouter />
        </ToastRegion>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
