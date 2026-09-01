import { RouterProvider } from "@tanstack/react-router";
import { ToastRegion } from "@/shared/ui";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { router } from "../router";

export function App() {
  return (
    <AppErrorBoundary>
      <ToastRegion>
        <RouterProvider router={router} />
      </ToastRegion>
    </AppErrorBoundary>
  );
}
