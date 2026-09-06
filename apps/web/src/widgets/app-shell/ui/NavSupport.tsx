import { FileText } from "lucide-react";
import { SidebarMenu, SidebarMenuItem } from "@/shared/ui";
import { SidebarNavLink } from "./SidebarNavLink";

export function NavSupport({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="업무 안내" className="mt-auto pt-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarNavLink
            to="/guide"
            pathname={pathname}
            label="업무 가이드"
            className="data-[active=true]:font-semibold"
          >
            <FileText aria-hidden="true" />
            <span>업무 가이드</span>
          </SidebarNavLink>
        </SidebarMenuItem>
      </SidebarMenu>
    </nav>
  );
}
