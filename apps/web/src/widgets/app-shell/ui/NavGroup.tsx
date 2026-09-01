/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { Link } from "@tanstack/react-router";
import {
  Boxes,
  ClipboardList,
  Factory,
  FlaskConical,
  GitBranch,
  History,
  LayoutDashboard,
  PackageSearch,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui";
import type {
  NavigationGroup as NavigationGroupModel,
  NavigationIcon,
} from "../model/navigation";

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

interface NavGroupProps {
  group: NavigationGroupModel;
  pathname: string;
}

export function NavGroup({ group, pathname }: NavGroupProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup className="py-2">
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
                  <Link to={item.to} onClick={() => setOpenMobile(false)}>
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  aria-label={`${item.label}${item.pending ? ", 구현 예정" : ""}`}
                  className="text-sidebar-muted disabled:opacity-100"
                  disabled
                  tooltip={item.label}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.pending ? (
                    <SidebarMenuBadge className="rounded-full border border-sidebar-border px-1.5 font-mono text-[0.5625rem] tracking-wide text-sidebar-muted">
                      예정
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
