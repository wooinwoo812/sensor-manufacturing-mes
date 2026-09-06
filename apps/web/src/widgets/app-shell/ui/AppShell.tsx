import type { RoleCode } from "@/entities/session";
import { RoleOnboarding } from "./RoleOnboarding";
import { ShieldCheck } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { cn, getCookie } from "@/shared/lib";
import { SidebarInset, SidebarProvider } from "@/shared/ui";
import type { NavigationGroup } from "../model/navigation";
import { usePageCrumbValue } from "../model/page-crumb-context";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { ContentReadiness } from "./ContentReadiness";
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
  onboarding?: {
    userId: string;
    roleCode: RoleCode;
    permissions: readonly string[];
  };
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
  onboarding,
  pageGroup,
  pageTitle,
  pathname,
}: AppShellProps) {
  const defaultOpen = getCookie("sidebar_state") !== "false";
  const crumb = usePageCrumbValue();
  const [contentReady, setContentReady] = useState(false);
  const markContentReady = useCallback(() => setContentReady(true), []);

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
        <Header className="border-b border-border bg-surface" fixed>
          <nav
            aria-label="현재 위치"
            className="me-auto flex min-w-0 flex-1 items-center gap-2 text-sm"
            title={[pageGroup, pageTitle, crumb].filter(Boolean).join(" / ")}
          >
            {pageGroup ? (
              <>
                <span className="hidden shrink-0 text-text-muted md:inline">
                  {pageGroup}
                </span>
                <span
                  aria-hidden="true"
                  className="hidden shrink-0 text-text-subtle md:inline"
                >
                  /
                </span>
              </>
            ) : null}
            {crumb ? (
              <>
                <span className="hidden shrink-0 text-text-muted md:inline">
                  {pageTitle}
                </span>
                <span
                  aria-hidden="true"
                  className="hidden shrink-0 text-text-subtle md:inline"
                >
                  /
                </span>
                <span className="min-w-0 truncate font-semibold">{crumb}</span>
              </>
            ) : (
              <span className="min-w-0 truncate font-semibold">
                {pageTitle}
              </span>
            )}
          </nav>
          <div className="hidden h-8 shrink-0 items-center gap-2 rounded-full bg-surface-subtle px-3 sm:flex">
            <ShieldCheck
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-xs font-medium">{currentRole}</span>
          </div>
          {onboarding ? (
            <RoleOnboarding
              key={onboarding.userId + ":" + onboarding.roleCode}
              userId={onboarding.userId}
              roleCode={onboarding.roleCode}
              permissions={onboarding.permissions}
              roleLabel={currentRole}
              ready={contentReady}
              navigation={navigation}
            />
          ) : null}
          <ThemeSwitch />
        </Header>
        <ContentReadiness onReady={markContentReady}>
          {children}
        </ContentReadiness>
        <span className="sr-only" aria-live="polite">
          현재 경로 {pathname}
        </span>
      </SidebarInset>
    </SidebarProvider>
  );
}
