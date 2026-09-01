import { RouterProvider } from "@tanstack/react-router";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { router } from "../router";

export function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
