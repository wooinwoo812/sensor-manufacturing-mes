/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/shared/ui";
import type { NavigationGroup } from "../model/navigation";
import { AppTitle } from "./AppTitle";
import { NavGroup } from "./NavGroup";
import { NavUser } from "./NavUser";

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
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="주요 업무영역">
          {navigation.map((group) => (
            <NavGroup group={group} key={group.label} pathname={pathname} />
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          currentRole={currentRole}
          showDevelopmentTools={showDevelopmentTools}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
