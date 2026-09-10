import { RouterProvider, useRouterState } from "@tanstack/react-router";
import { ThemeProvider } from "@/shared/lib";
import { ToastRegion } from "@/shared/ui";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { router } from "../router";
import { InitialLoading } from "./InitialLoading";

function AppRouter() {
  const hasMatches = useRouterState({
    router,
    select: (state) => state.matches.length > 0,
  });
  return (
    <>
      {!hasMatches ? <InitialLoading /> : null}
      <RouterProvider router={router} />
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
