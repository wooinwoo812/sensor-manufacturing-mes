import { requestJson } from "@/shared/api";
import type { RoleCatalog, UserAccessHistory } from "../model/user-access";
import type { AdminUserListItem } from "../model/admin-user";

export async function fetchAdminUsers(
  signal?: AbortSignal,
): Promise<AdminUserListItem[]> {
  return requestJson<AdminUserListItem[]>("/api/admin/users", {
    ...(signal !== undefined ? { signal } : {}),
  });
}

export function fetchRoleCatalog(signal?: AbortSignal) {
  return requestJson<RoleCatalog>("/api/admin/users/roles", {
    ...(signal ? { signal } : {}),
  });
}
export function fetchUserAccessHistory(
  id: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) {
  return requestJson<UserAccessHistory>(
    "/api/admin/users/" +
      encodeURIComponent(id) +
      "/access-history?page=" +
      page +
      "&pageSize=" +
      pageSize,
    { ...(signal ? { signal } : {}) },
  );
}
