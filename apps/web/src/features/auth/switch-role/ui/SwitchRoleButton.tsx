import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/shared/ui";
import { logoutSession } from "../api/logout";

interface SwitchRoleButtonProps {
  csrfToken: string;
  currentRole?: string;
  onSignedOut: () => void;
}

export function SwitchRoleButton({
  csrfToken,
  currentRole,
  onSignedOut,
}: SwitchRoleButtonProps) {
  const { setOpenMobile } = useSidebar();
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSwitchRole() {
    setIsPending(true);
    setHasError(false);
    try {
      await logoutSession(csrfToken);
      setOpenMobile(false);
      onSignedOut();
    } catch {
      setIsPending(false);
      setHasError(true);
    }
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-busy={isPending || undefined}
          disabled={isPending}
          onClick={() => void handleSwitchRole()}
          tooltip={currentRole ? currentRole + " · 역할 전환" : "역할 전환"}
          aria-label="역할 전환"
          title={currentRole ? currentRole + " · 역할 전환" : "역할 전환"}
          className="h-11"
        >
          {isPending ? (
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          {currentRole ? (
            <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
              {currentRole}
            </span>
          ) : null}
          <span className="shrink-0 group-data-[collapsible=icon]:hidden">
            {isPending ? "종료 중" : "역할 전환"}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {hasError ? (
        <SidebarMenuItem>
          <p
            className="px-2 py-1 text-xs leading-5 text-danger-strong group-data-[collapsible=icon]:sr-only"
            role="alert"
          >
            세션을 종료하지 못했습니다. 다시 시도해 주세요.
          </p>
        </SidebarMenuItem>
      ) : null}
    </>
  );
}
