import { Outlet, useLocation } from "@tanstack/react-router";
import { resolveShellContext } from "@/app/shell-config";
import { AppShell } from "@/widgets/app-shell";

export function AuthenticatedLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const shellContext = resolveShellContext(pathname);

  return (
    <AppShell {...shellContext}>
      <Outlet />
    </AppShell>
  );
}
