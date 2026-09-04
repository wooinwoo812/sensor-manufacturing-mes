import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "@/shared/lib";
import { ToastRegion } from "@/shared/ui";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { router } from "../router";

export function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <ToastRegion>
          <RouterProvider router={router} />
        </ToastRegion>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
