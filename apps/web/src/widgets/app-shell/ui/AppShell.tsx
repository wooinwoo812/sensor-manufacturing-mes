import { Link } from "@tanstack/react-router";
import { Bell, SearchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn, getCookie } from "@/shared/lib";
import {
  Avatar,
  AvatarFallback,
  ShadcnButton,
  SidebarInset,
  SidebarProvider,
} from "@/shared/ui";
import { LayoutProvider } from "../model/layout-context";
import type { NavigationGroup } from "../model/navigation";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { SkipToMain } from "./SkipToMain";
import { ThemeSwitch } from "./ThemeSwitch";

export interface AppShellProps {
  children: ReactNode;
  navigation: NavigationGroup[];
  pathname: string;
  pageTitle: string;
  screenId?: string;
  currentRole: string;
  lastUpdatedAt: string;
}

export type AppShellConfiguration = Omit<AppShellProps, "children">;

export function AppShell({
  children,
  currentRole,
  navigation,
  pathname,
}: AppShellProps) {
  const defaultOpen = getCookie("sidebar_state") !== "false";

  return (
    <LayoutProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar
          currentRole={currentRole}
          navigation={navigation}
          pathname={pathname}
        />
        <SidebarInset
          className={cn(
            "@container/content",
            "has-data-[layout=fixed]:h-svh",
            "peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]",
          )}
        >
          <Header>
            <nav
              aria-label="대시보드 보조 메뉴"
              className="me-auto hidden items-center space-x-4 lg:flex xl:space-x-6"
            >
              <Link className="text-sm font-medium" to="/dashboard">
                개요
              </Link>
              <span className="text-sm font-medium text-muted-foreground">
                생산
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                품질
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                추적
              </span>
            </nav>
            <ShadcnButton
              aria-keyshortcuts="Meta+K Control+K"
              className="group relative h-8 w-full flex-1 justify-start rounded-md bg-muted/25 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent sm:w-40 sm:pe-12 md:flex-none lg:w-52 xl:w-64"
              title="전역 검색은 LOT 계보 기능에서 연결됩니다"
              type="button"
              variant="outline"
            >
              <SearchIcon
                aria-hidden="true"
                className="absolute inset-s-1.5 top-1/2 -translate-y-1/2"
                size={16}
              />
              <span className="ms-4">검색</span>
              <kbd className="pointer-events-none absolute inset-e-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 select-none group-hover:bg-accent sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </ShadcnButton>
            <ThemeSwitch />
            <ShadcnButton aria-label="알림" size="icon" type="button" variant="ghost">
              <Bell />
            </ShadcnButton>
            <ShadcnButton
              aria-label={`현재 역할: ${currentRole}`}
              className="relative h-8 w-8 rounded-full"
              size="icon"
              type="button"
              variant="ghost"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>관</AvatarFallback>
              </Avatar>
            </ShadcnButton>
          </Header>
          {children}
          <span className="sr-only" aria-live="polite">
            현재 경로 {pathname}
          </span>
        </SidebarInset>
      </SidebarProvider>
    </LayoutProvider>
  );
}
