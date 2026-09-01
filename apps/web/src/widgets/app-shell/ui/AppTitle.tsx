/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { cn } from "@/shared/lib";
import {
  ShadcnButton,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui";

export function AppTitle() {
  const { setOpenMobile, toggleSidebar } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          className="gap-0 py-0 hover:bg-transparent active:bg-transparent"
          size="lg"
        >
          <div>
            <Link
              className="grid flex-1 text-start text-sm leading-tight"
              onClick={() => setOpenMobile(false)}
              to="/dashboard"
            >
              <span className="truncate font-bold">FabriScope MES</span>
              <span className="truncate text-xs">Sensor manufacturing</span>
            </Link>
            <ShadcnButton
              className={cn("aspect-square size-8 max-md:scale-125")}
              data-sidebar="trigger"
              data-slot="sidebar-trigger"
              onClick={toggleSidebar}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="md:hidden" />
              <Menu className="max-md:hidden" />
              <span className="sr-only">업무 메뉴 접기 또는 펼치기</span>
            </ShadcnButton>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
