/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { X } from "lucide-react";
import {
  Button,
  useSidebar,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/shared/ui";
import type { NavigationGroup } from "../model/navigation";
import { AppTitle } from "./AppTitle";
import { NavGroup } from "./NavGroup";
import { NavSupport } from "./NavSupport";
import { NavUser } from "./NavUser";

interface AppSidebarProps {
  csrfToken: string;
  currentRole: string;
  navigation: NavigationGroup[];
  onSignedOut: () => void;
  pathname: string;
}

export function AppSidebar({
  csrfToken,
  currentRole,
  navigation,
  onSignedOut,
  pathname,
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const homePath =
    navigation
      .flatMap((group) => group.items)
      .find((item) => item.to && !item.pending)?.to ?? "/dashboard";
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="h-16 shrink-0 justify-center border-b border-sidebar-border px-3 py-2 group-data-[collapsible=icon]:px-1">
        <div className="flex min-w-0 items-center gap-1">
          <div className="min-w-0 flex-1">
            <AppTitle homePath={homePath} />
          </div>
          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="업무 메뉴 닫기"
              onClick={() => setOpenMobile(false)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-5 px-2 py-3 group-data-[collapsible=icon]:px-1">
        <nav
          aria-label="주요 업무영역"
          className="space-y-4 group-data-[collapsible=icon]:space-y-3"
        >
          {navigation.map((group) => (
            <NavGroup group={group} key={group.label} pathname={pathname} />
          ))}
        </nav>
        <NavSupport pathname={pathname} />
      </SidebarContent>
      <SidebarFooter className="shrink-0 border-t border-sidebar-border px-2 py-2 group-data-[collapsible=icon]:px-1">
        <NavUser
          csrfToken={csrfToken}
          currentRole={currentRole}
          onSignedOut={onSignedOut}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
