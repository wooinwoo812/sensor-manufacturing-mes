import { requestJson } from "@/shared/api";
import type { AuditEventListResult } from "../model/audit-event";

export async function fetchAuditEvents(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<AuditEventListResult> {
  const query = searchParams.toString();
  return requestJson<AuditEventListResult>(
    `/api/audit-events${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
