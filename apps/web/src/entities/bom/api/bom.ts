import { requestJson } from "@/shared/api";
import type { BomRevisionListResult } from "../model/bom";

export async function fetchBomRevisions(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<BomRevisionListResult> {
  const query = searchParams.toString();
  return requestJson<BomRevisionListResult>(
    `/api/materials/boms${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
