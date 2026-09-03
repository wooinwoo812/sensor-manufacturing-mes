import { requestJson } from "@/shared/api";
import type { MaterialLotListResult } from "../model/material-lot";

export async function fetchMaterialLots(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<MaterialLotListResult> {
  const query = searchParams.toString();
  return requestJson<MaterialLotListResult>(
    `/api/material-lots${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
