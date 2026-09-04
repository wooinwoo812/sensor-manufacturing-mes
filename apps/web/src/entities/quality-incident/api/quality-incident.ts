import { requestJson } from "@/shared/api";
import type {
  QualityIncidentDetail,
  QualityIncidentListResult,
} from "../model/quality-incident";

export async function fetchQualityIncidents(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<QualityIncidentListResult> {
  const query = searchParams.toString();
  return requestJson<QualityIncidentListResult>(
    `/api/quality-incidents${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}

export async function fetchQualityIncidentDetail(
  qualityIncidentId: string,
  signal?: AbortSignal,
): Promise<QualityIncidentDetail> {
  return requestJson<QualityIncidentDetail>(
    `/api/quality-incidents/${encodeURIComponent(qualityIncidentId)}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
