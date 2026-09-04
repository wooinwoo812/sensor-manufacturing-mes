import { requestJson } from "@/shared/api";
import type {
  MaterialLotDetail,
  MaterialLotListResult,
} from "../model/material-lot";

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

export async function fetchMaterialLot(
  materialLotId: string,
  signal?: AbortSignal,
): Promise<MaterialLotDetail> {
  return requestJson<MaterialLotDetail>(
    `/api/material-lots/${encodeURIComponent(materialLotId)}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
