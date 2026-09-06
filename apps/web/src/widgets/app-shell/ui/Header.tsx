/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { cn } from "@/shared/lib";
import { Separator } from "@/shared/ui";
import { SidebarTrigger, useSidebar } from "@/shared/ui";

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean;
  ref?: React.Ref<HTMLElement>;
};

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const { isMobile, openMobile, open } = useSidebar();
  const expanded = isMobile ? openMobile : open;
  const toggleLabel = isMobile
    ? expanded
      ? "업무 메뉴 닫기"
      : "업무 메뉴 열기"
    : expanded
      ? "업무 메뉴 접기"
      : "업무 메뉴 펼치기";
  return (
    <header
      className={cn(
        "z-header h-16",
        fixed && "header-fixed peer/header sticky top-0 w-[inherit]",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "relative flex h-full w-full min-w-0 items-center gap-3 px-4 sm:gap-4 md:px-7",
        )}
      >
        <SidebarTrigger
          variant="ghost"
          className="size-11 shrink-0 lg:size-9"
          aria-label={toggleLabel}
          aria-expanded={expanded}
          title={toggleLabel}
        />
        <Separator orientation="vertical" className="h-6 shrink-0" />
        {children}
      </div>
    </header>
  );
}
