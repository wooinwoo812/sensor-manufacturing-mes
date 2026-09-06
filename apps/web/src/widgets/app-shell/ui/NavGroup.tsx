/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Factory,
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
} from "@/shared/ui";
import type {
  NavigationGroup as NavigationGroupModel,
  NavigationIcon,
} from "../model/navigation";
import { SidebarNavLink } from "./SidebarNavLink";

const iconByName: Record<NavigationIcon, LucideIcon> = {
  audit: History,
  bom: Boxes,
  dashboard: LayoutDashboard,
  execution: Factory,
  incident: ShieldAlert,
  inspection: ClipboardCheck,
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
  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="h-7 px-3 text-sm font-medium text-sidebar-muted group-data-[collapsible=icon]:hidden">
        {group.label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => {
          const Icon = iconByName[item.icon];

          return (
            <SidebarMenuItem key={item.label}>
              {item.to ? (
                <SidebarNavLink
                  to={item.to}
                  pathname={pathname}
                  label={item.label}
                  className="text-sidebar-foreground data-[active=true]:font-semibold [&>svg]:text-sidebar-muted data-[active=true]:[&>svg]:text-sidebar-primary"
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                </SidebarNavLink>
              ) : (
                <SidebarMenuButton
                  aria-label={`${item.label}${item.pending ? ", 구현 예정" : ""}`}
                  disabled
                  tooltip={item.label}
                >
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.pending ? (
                    <SidebarMenuBadge>예정</SidebarMenuBadge>
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
