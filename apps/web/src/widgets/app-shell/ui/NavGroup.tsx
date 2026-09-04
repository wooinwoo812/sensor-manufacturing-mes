/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { Link } from "@tanstack/react-router";
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
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="h-7 text-[11px] font-semibold tracking-wide text-text-subtle">
        {group.label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => {
          const Icon = iconByName[item.icon];

          return (
            <SidebarMenuItem key={item.label}>
              {item.to ? (
                <SidebarMenuButton
                  asChild
                  className="h-9 text-sm data-[active=true]:font-semibold [&>svg]:text-text-muted data-[active=true]:[&>svg]:text-sidebar-accent-foreground"
                  // 상세(/work-orders/xxx)에서도 부모 메뉴를 활성으로 유지해 현재 영역을 잃지 않게 한다.
                  isActive={item.to === pathname || pathname.startsWith(`${item.to}/`)}
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
