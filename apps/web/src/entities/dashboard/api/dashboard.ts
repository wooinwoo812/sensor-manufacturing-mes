import { requestJson } from "@/shared/api";
import type { DashboardSummary } from "../model/dashboard";

export async function fetchDashboardSummary(
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  return requestJson<DashboardSummary>("/api/dashboard/summary", {
    ...(signal !== undefined ? { signal } : {}),
  });
}
