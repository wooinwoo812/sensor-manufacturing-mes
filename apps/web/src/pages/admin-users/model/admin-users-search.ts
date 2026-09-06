import { readPageSize } from "@/shared/lib";
export interface AdminUsersSearch {
  page?: number;
  pageSize?: number;
}
export function readAdminUsersSearch(
  raw: Record<string, unknown>,
): AdminUsersSearch {
  const page =
    typeof raw.page === "string" || typeof raw.page === "number"
      ? Number(raw.page)
      : 1;
  const pageSize = readPageSize(raw.pageSize);
  return {
    ...(Number.isSafeInteger(page) && page > 1 ? { page } : {}),
    ...(pageSize === undefined ? {} : { pageSize }),
  };
}
