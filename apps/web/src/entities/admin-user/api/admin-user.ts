import { requestJson } from "@/shared/api";
import type { AdminUserListItem } from "../model/admin-user";

export async function fetchAdminUsers(
  signal?: AbortSignal,
): Promise<AdminUserListItem[]> {
  return requestJson<AdminUserListItem[]>("/api/admin/users", {
    ...(signal !== undefined ? { signal } : {}),
  });
}
