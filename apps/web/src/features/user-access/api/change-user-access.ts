import { requestJson } from "@/shared/api";
import type { AdminUserListItem } from "@/entities/admin-user";
export interface AccessChange {
  roleCode: string;
  isActive: boolean;
  reason: string;
  expectedUpdatedAt: string;
}
export function changeUserAccess(
  id: string,
  change: AccessChange,
  csrfToken: string,
) {
  return requestJson<{
    user: AdminUserListItem;
    changed: boolean;
    sessionRevoked: boolean;
  }>("/api/admin/users/" + encodeURIComponent(id) + "/access", {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(change),
  });
}
