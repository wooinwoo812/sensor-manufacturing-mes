import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SidebarMenuButton, useSidebar } from "@/shared/ui";
import type { NavigationItem } from "../model/navigation";
import { isNavigationActive } from "../model/navigation-active";

interface SidebarNavLinkProps {
  to: NonNullable<NavigationItem["to"]> | "/guide" | "/dev/ui-kit";
  pathname: string;
  label: string;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

// Business and support links share selection, accessibility and mobile dismissal.
export function SidebarNavLink({
  to,
  pathname,
  label,
  ariaLabel,
  className,
  children,
}: SidebarNavLinkProps) {
  const { setOpenMobile } = useSidebar();
  const active = isNavigationActive(pathname, to);
  return (
    <SidebarMenuButton
      asChild
      isActive={active}
      tooltip={label}
      aria-label={ariaLabel}
      className={className}
    >
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpenMobile(false)}
      >
        {children}
      </Link>
    </SidebarMenuButton>
  );
}
