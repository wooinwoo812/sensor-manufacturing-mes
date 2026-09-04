import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/ui";
import { logoutSession } from "../api/logout";

interface SwitchRoleButtonProps {
  csrfToken: string;
  onSignedOut: () => void;
}

export function SwitchRoleButton({
  csrfToken,
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
          tooltip="역할 전환"
        >
          {isPending ? (
            <LoaderCircle
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          <span>{isPending ? "세션 종료 중" : "역할 전환"}</span>
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
