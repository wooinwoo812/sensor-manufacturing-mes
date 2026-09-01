import { RouterProvider } from "@tanstack/react-router";
import { ToastRegion } from "@/shared/ui";
import { ThemeProvider } from "../providers/shadcn/theme-provider";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { router } from "../router";

export function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="fabriscope-theme">
        <ToastRegion>
          <RouterProvider router={router} />
        </ToastRegion>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
