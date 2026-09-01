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
  Menu,
  PackageSearch,
  Search,
  ShieldAlert,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui";

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
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-text">
      <a
        className="fixed left-3 top-3 z-skip -translate-y-24 rounded-control border-2 border-accent bg-surface px-4 py-2 font-semibold text-text-strong shadow-panel focus:translate-y-0"
        href="#main-content"
      >
        본문으로 건너뛰기
      </a>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-sidebar flex w-60 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-text shadow-panel transition-transform motion-reduce:transition-none lg:static lg:w-auto lg:translate-x-0 lg:shadow-none",
            mobileNavigationOpen && "translate-x-0",
          )}
          aria-label="주요 업무영역"
        >
          <div className="flex h-17 items-center gap-3 border-b border-sidebar-border px-4 xl:px-5">
            <span className="grid size-9 place-items-center rounded-brand bg-accent-bright font-mono text-xs font-black tracking-tight text-sidebar">
              FM
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-bold text-white">
                FabriScope MES
              </strong>
              <span className="block truncate text-[0.6875rem] text-sidebar-muted">
                Manufacturing execution
              </span>
            </div>
            <Button
              className="text-sidebar-text hover:bg-sidebar-active lg:hidden"
              size="icon"
              variant="ghost"
              onClick={() => setMobileNavigationOpen(false)}
              aria-label="메뉴 닫기"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navigation.map((group) => (
              <div className="mb-5" key={group.label}>
                <h2 className="mb-1.5 px-2 font-mono text-[0.625rem] font-bold uppercase tracking-[0.16em] text-sidebar-muted">
                  {group.label}
                </h2>
                <ul className="grid gap-0.5">
                  {group.items.map((item) => {
                    const Icon = iconByName[item.icon];

                    return (
                      <li key={item.label}>
                        {item.to ? (
                          <Link
                            className="flex min-h-10 items-center gap-3 rounded-control border border-transparent px-3 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-bright/40"
                            activeProps={{
                              className:
                                "border-sidebar-border bg-sidebar-active text-white shadow-[inset_3px_0_var(--mes-color-accent-bright)]",
                            }}
                            to={item.to}
                            onClick={() => setMobileNavigationOpen(false)}
                          >
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        ) : (
                          <span
                            className="flex min-h-10 items-center gap-3 rounded-control border border-transparent px-3 text-sm text-sidebar-muted"
                            aria-disabled="true"
                            title="후속 기능 Issue에서 연결됩니다"
                          >
                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                            <span className="flex-1">{item.label}</span>
                            {item.pending ? (
                              <span className="rounded-full border border-sidebar-border px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-wide">
                                예정
                              </span>
                            ) : null}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            {import.meta.env.DEV ? (
              <Link
                className="flex min-h-10 items-center gap-3 rounded-control px-3 text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-white"
                to="/dev/ui-kit"
              >
                <CircleHelp className="size-4" aria-hidden="true" />
                UI 시스템 점검
              </Link>
            ) : null}
            <div className="mt-2 rounded-control border border-sidebar-border bg-sidebar-elevated px-3 py-2.5">
              <span className="block text-[0.625rem] text-sidebar-muted">현재 역할</span>
              <strong className="mt-0.5 block text-xs text-white">{currentRole}</strong>
            </div>
          </div>
        </aside>

        {mobileNavigationOpen ? (
          <button
            className="fixed inset-0 z-overlay bg-overlay lg:hidden"
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMobileNavigationOpen(false)}
          />
        ) : null}

        <div className="min-w-0">
          <header className="sticky top-0 z-header flex h-17 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur md:px-6 xl:px-8">
            <Button
              className="lg:hidden"
              size="icon"
              variant="ghost"
              onClick={() => setMobileNavigationOpen(true)}
              aria-label="메뉴 열기"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>

            <form className="relative hidden max-w-md flex-1 md:block" role="search">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" aria-hidden="true" />
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
                <strong className="ml-1 font-semibold text-text">{lastUpdatedAt}</strong>
              </span>
              <Button size="icon" variant="ghost" aria-label="알림">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
              <Button className="hidden sm:inline-flex" variant="secondary">
                <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-[0.625rem] font-bold text-accent-strong">
                  관
                </span>
                {currentRole}
                <ChevronsUpDown className="size-3.5 text-text-subtle" aria-hidden="true" />
              </Button>
            </div>
          </header>

          <main id="main-content" className="mx-auto max-w-screen-2xl px-4 py-5 md:px-6 xl:px-8 xl:py-7" tabIndex={-1}>
            <nav className="mb-3 flex items-center gap-2 text-xs text-text-muted" aria-label="현재 위치">
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
          </main>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        현재 경로 {pathname}
      </span>
    </div>
  );
}
