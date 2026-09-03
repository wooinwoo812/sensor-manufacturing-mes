import { Outlet, useLocation } from "@tanstack/react-router";
import type { Session } from "@/entities/session";
import { resolveShellContext } from "@/app/shell-config";
import { AppShell } from "@/widgets/app-shell";

export function AuthenticatedLayout({ session }: { session: Session }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const shellContext = resolveShellContext(pathname, session);

  return (
    <AppShell
      {...shellContext}
      csrfToken={session.csrfToken}
      onSignedOut={() => window.location.replace("/login?reason=role-changed")}
    >
      <Outlet />
    </AppShell>
  );
}
