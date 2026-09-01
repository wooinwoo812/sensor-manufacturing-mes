/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { Link } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/shared/ui";
import { useLayout } from "../model/layout-context";
import type { NavigationGroup } from "../model/navigation";
import { NavGroup } from "./NavGroup";

interface AppSidebarProps {
  currentRole: string;
  navigation: NavigationGroup[];
  pathname: string;
  showDevelopmentTools?: boolean;
}

export function AppSidebar({
  currentRole,
  navigation,
  pathname,
  showDevelopmentTools = import.meta.env.DEV,
}: AppSidebarProps) {
  const { collapsible, variant } = useLayout();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
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
            <NavGroup group={group} key={group.label} pathname={pathname} />
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {showDevelopmentTools ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                isActive={pathname === "/dev/ui-kit"}
                tooltip="UI 시스템 점검"
              >
                <Link to="/dev/ui-kit" onClick={() => setOpenMobile(false)}>
                  <CircleHelp aria-hidden="true" />
                  <span>UI 시스템 점검</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label={`현재 역할: ${currentRole}`}
              className="h-12 border border-sidebar-border bg-sidebar-elevated text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              size="lg"
              tooltip={`현재 역할: ${currentRole}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs font-bold text-accent-strong">
                {currentRole.slice(0, 1)}
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
  );
}
