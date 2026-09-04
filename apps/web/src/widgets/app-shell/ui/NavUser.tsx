/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { Link } from "@tanstack/react-router";
import { PanelsTopLeft, ShieldCheck } from "lucide-react";
import { SwitchRoleButton } from "@/features/auth/switch-role";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui";

interface NavUserProps {
  csrfToken: string;
  currentRole: string;
  onSignedOut: () => void;
  showDevelopmentTools: boolean;
}

export function NavUser({
  csrfToken,
  currentRole,
  onSignedOut,
  showDevelopmentTools,
}: NavUserProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          aria-label={`현재 역할: ${currentRole}`}
          className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-start text-sm group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
          role="group"
          title={`현재 역할: ${currentRole}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">{currentRole}</span>
            <span className="truncate text-xs text-sidebar-foreground/65">
              현재 역할
            </span>
          </div>
        </div>
      </SidebarMenuItem>
      <SwitchRoleButton csrfToken={csrfToken} onSignedOut={onSignedOut} />
      {showDevelopmentTools ? (
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="UI 시스템 점검">
            <Link to="/dev/ui-kit" onClick={() => setOpenMobile(false)}>
              <PanelsTopLeft aria-hidden="true" />
              <span>UI 시스템 점검</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
    </SidebarMenu>
  );
}
