import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn, getCookie } from "@/shared/lib";
import {
  SidebarInset,
  SidebarProvider,
} from "@/shared/ui";
import type { NavigationGroup } from "../model/navigation";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { SkipToMain } from "./SkipToMain";
import { ThemeSwitch } from "./ThemeSwitch";

export interface AppShellProps {
  children: ReactNode;
  csrfToken: string;
  navigation: NavigationGroup[];
  onSignedOut: () => void;
  pathname: string;
  pageTitle: string;
  pageGroup?: string | undefined;
  currentRole: string;
}

export type AppShellConfiguration = Omit<
  AppShellProps,
  "children" | "csrfToken" | "onSignedOut"
>;

export function AppShell({
  children,
  csrfToken,
  currentRole,
  navigation,
  onSignedOut,
  pageGroup,
  pageTitle,
  pathname,
}: AppShellProps) {
  const defaultOpen = getCookie("sidebar_state") !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SkipToMain />
      <AppSidebar
        csrfToken={csrfToken}
        currentRole={currentRole}
        navigation={navigation}
        onSignedOut={onSignedOut}
        pathname={pathname}
      />
      <SidebarInset
        className={cn(
          "@container/content",
          "has-data-[layout=fixed]:h-svh",
          "peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]",
        )}
      >
        <Header
          className="border-b border-border bg-background lg:rounded-t-lg"
          fixed
        >
          <nav aria-label="현재 위치" className="me-auto flex min-w-0 items-center gap-1.5 text-sm">
            {pageGroup ? (
              <>
                <span className="shrink-0 text-text-muted">{pageGroup}</span>
                <span aria-hidden="true" className="shrink-0 text-text-subtle">
                  /
                </span>
              </>
            ) : null}
            <span className="truncate font-semibold">{pageTitle}</span>
          </nav>
          <div className="hidden h-9 items-center gap-2 rounded-md border bg-card px-3 lg:flex peer-data-[state=expanded]:hidden">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium">{currentRole}</span>
          </div>
          <ThemeSwitch />
        </Header>
        {children}
        <span className="sr-only" aria-live="polite">
          현재 경로 {pathname}
        </span>
      </SidebarInset>
    </SidebarProvider>
  );
}
