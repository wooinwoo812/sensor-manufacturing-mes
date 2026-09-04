import { requestJson } from "@/shared/api";
import type { InspectionListResult } from "../model/inspection";

export async function fetchInspections(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<InspectionListResult> {
  const query = searchParams.toString();
  return requestJson<InspectionListResult>(
    `/api/inspections${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
