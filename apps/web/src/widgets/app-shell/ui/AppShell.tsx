import { Link } from "@tanstack/react-router";
import { Bell, ChevronsUpDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button, SidebarInset, SidebarProvider } from "@/shared/ui";
import { LayoutProvider } from "../model/layout-context";
import type { NavigationGroup } from "../model/navigation";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Main } from "./Main";
import { SkipToMain } from "./SkipToMain";

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
  lastUpdatedAt,
  navigation,
  pageTitle,
  pathname,
  screenId,
}: AppShellProps) {
  return (
    <LayoutProvider>
      <SidebarProvider defaultOpen>
        <SkipToMain />
        <AppSidebar
          currentRole={currentRole}
          navigation={navigation}
          pathname={pathname}
        />

        <SidebarInset className="@container/content min-w-0 bg-canvas text-text">
          <Header
            className="border-b border-border bg-surface/95 backdrop-blur"
            fixed
          >
            <form
              className="relative hidden max-w-md flex-1 md:block"
              role="search"
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle"
                aria-hidden="true"
              />
              <input
                className="h-10 w-full rounded-control border border-border bg-surface-subtle pl-9 pr-3 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:bg-surface focus:outline-none focus:ring-3 focus:ring-focus/25 disabled:cursor-not-allowed"
                type="search"
                aria-label="전역 업무 검색"
                placeholder="작업지시·LOT·일련번호 검색"
                disabled
                title="LOT 계보 기능에서 연결됩니다"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-right text-[0.6875rem] leading-4 text-text-muted xl:block">
                마지막 갱신
                <strong className="ml-1 font-semibold text-text">
                  {lastUpdatedAt}
                </strong>
              </span>
              <Button size="icon" variant="ghost" aria-label="알림">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
              <Button className="hidden sm:inline-flex" variant="secondary">
                <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-[0.625rem] font-bold text-accent-strong">
                  관
                </span>
                {currentRole}
                <ChevronsUpDown
                  className="size-3.5 text-text-subtle"
                  aria-hidden="true"
                />
              </Button>
            </div>
          </Header>

          <Main
            fluid
            id="main-content"
            className="mx-auto w-full max-w-screen-2xl px-4 py-5 md:px-6 xl:px-8 xl:py-7"
            tabIndex={-1}
          >
            <nav
              className="mb-3 flex items-center gap-2 text-xs text-text-muted"
              aria-label="현재 위치"
            >
              <Link className="hover:text-accent-strong" to="/dashboard">
                홈
              </Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="text-text">
                {pageTitle}
              </span>
            </nav>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
              <div>
                {screenId ? (
                  <span className="font-mono text-[0.6875rem] font-bold tracking-[0.12em] text-accent">
                    {screenId}
                  </span>
                ) : null}
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-strong xl:text-[1.75rem]">
                  {pageTitle}
                </h1>
              </div>
              <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted">
                개발 환경
              </span>
            </div>

            {children}
          </Main>
          <span className="sr-only" aria-live="polite">
            현재 경로 {pathname}
          </span>
        </SidebarInset>
      </SidebarProvider>
    </LayoutProvider>
  );
}
