import { requestJson } from "@/shared/api";
import type {
  InspectionDetail,
  InspectionListResult,
} from "../model/inspection";

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

export async function fetchInspection(
  inspectionId: string,
  signal?: AbortSignal,
): Promise<InspectionDetail> {
  return requestJson<InspectionDetail>(
    `/api/inspections/${encodeURIComponent(inspectionId)}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
