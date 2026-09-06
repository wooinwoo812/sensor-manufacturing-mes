import { SwitchRoleButton } from "@/features/auth/switch-role";
import { SidebarMenu } from "@/shared/ui";

interface NavUserProps {
  csrfToken: string;
  currentRole: string;
  onSignedOut: () => void;
}

export function NavUser({ csrfToken, currentRole, onSignedOut }: NavUserProps) {
  return (
    <SidebarMenu>
      <SwitchRoleButton
        csrfToken={csrfToken}
        currentRole={currentRole}
        onSignedOut={onSignedOut}
      />
    </SidebarMenu>
  );
}
