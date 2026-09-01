import { Link } from "@tanstack/react-router";
import {
  Bell,
  Boxes,
  ChevronsUpDown,
  CircleHelp,
  ClipboardList,
  Factory,
  FlaskConical,
  GitBranch,
  History,
  LayoutDashboard,
  PackageSearch,
  Search,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Button,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/shared/ui";
import { Header } from "./Header";
import { Main } from "./Main";
import { SkipToMain } from "./SkipToMain";

type NavigationIcon =
  | "audit"
  | "bom"
  | "dashboard"
  | "execution"
  | "incident"
  | "inspection"
  | "material"
  | "trace"
  | "users"
  | "work-order";

interface NavigationItem {
  label: string;
  icon: NavigationIcon;
  to?: "/dashboard";
  pending?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

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

const iconByName: Record<NavigationIcon, LucideIcon> = {
  audit: History,
  bom: Boxes,
  dashboard: LayoutDashboard,
  execution: Factory,
  incident: ShieldAlert,
  inspection: FlaskConical,
  material: PackageSearch,
  trace: GitBranch,
  users: Users,
  "work-order": ClipboardList,
};

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
    <SidebarProvider defaultOpen>
      <SkipToMain />

      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="border-b border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-13 text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                size="lg"
                tooltip="FabriScope MES"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-brand bg-accent-bright font-mono text-xs font-black tracking-tight text-sidebar">
                  FM
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <strong className="truncate text-sm font-bold text-white">
                    FabriScope MES
                  </strong>
                  <span className="truncate text-[0.6875rem] text-sidebar-muted">
                    Manufacturing execution
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="py-2">
          <nav aria-label="주요 업무영역">
            {navigation.map((group) => (
              <SidebarGroup className="py-2" key={group.label}>
                <SidebarGroupLabel className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.16em] text-sidebar-muted">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = iconByName[item.icon];
                    const active = item.to === pathname;

                    return (
                      <SidebarMenuItem key={item.label}>
                        {item.to ? (
                          <SidebarMenuButton
                            asChild
                            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:text-white data-[active=true]:shadow-[inset_3px_0_var(--mes-color-accent-bright)]"
                            isActive={active}
                            tooltip={item.label}
                          >
                            <Link to={item.to}>
                              <Icon aria-hidden="true" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            className="text-sidebar-muted disabled:opacity-100"
                            disabled
                            tooltip={item.label}
                          >
                            <Icon aria-hidden="true" />
                            <span>{item.label}</span>
                            {item.pending ? (
                              <span className="ml-auto rounded-full border border-sidebar-border px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-wide group-data-[collapsible=icon]:hidden">
                                예정
                              </span>
                            ) : null}
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu>
            {import.meta.env.DEV ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                  isActive={pathname === "/dev/ui-kit"}
                  tooltip="UI 시스템 점검"
                >
                  <Link to="/dev/ui-kit">
                    <CircleHelp aria-hidden="true" />
                    <span>UI 시스템 점검</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-12 border border-sidebar-border bg-sidebar-elevated text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                size="lg"
                tooltip={`현재 역할: ${currentRole}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs font-bold text-accent-strong">
                  관
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-[0.625rem] text-sidebar-muted">
                    현재 역할
                  </span>
                  <strong className="truncate text-xs text-white">
                    {currentRole}
                  </strong>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="@container/content min-w-0 bg-canvas text-text">
        <Header
          className="border-b border-border bg-surface/95 backdrop-blur"
          fixed
        >
          <form className="relative hidden max-w-md flex-1 md:block" role="search">
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
  );
}
