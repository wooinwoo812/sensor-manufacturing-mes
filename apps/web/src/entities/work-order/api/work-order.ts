import { requestJson } from "@/shared/api";
import type { WorkOrderListResult } from "../model/work-order";

export async function fetchWorkOrders(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<WorkOrderListResult> {
  const query = searchParams.toString();
  return requestJson<WorkOrderListResult>(
    `/api/work-orders${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
