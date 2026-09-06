/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { Link } from "@tanstack/react-router";
import { Factory } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui";

import type { NavigationItem } from "../model/navigation";

export function AppTitle({
  homePath = "/dashboard",
}: {
  homePath?: NonNullable<NavigationItem["to"]>;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          tooltip="FabriScope MES · 첫 업무로 이동"
          className="p-0 group-data-[collapsible=icon]:p-1!"
        >
          <Link
            aria-label="FabriScope MES · 첫 업무로 이동"
            onClick={() => setOpenMobile(false)}
            to={homePath}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-brand bg-sidebar-primary text-sidebar-primary-foreground">
              <Factory className="size-4" aria-hidden="true" />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-bold tracking-tight">
                FabriScope MES
              </span>
              <span className="mt-1 truncate text-xs text-sidebar-muted">
                센서 제조 운영
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
