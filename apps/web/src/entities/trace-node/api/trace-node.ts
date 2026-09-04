import { requestJson } from "@/shared/api";
import type {
  TraceNodeDetail,
  TraceNodeListResult,
} from "../model/trace-node";

export async function fetchTraceNodes(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<TraceNodeListResult> {
  const query = searchParams.toString();
  return requestJson<TraceNodeListResult>(
    `/api/traceability/nodes${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}

export async function fetchTraceNodeDetail(
  traceNodeId: string,
  signal?: AbortSignal,
): Promise<TraceNodeDetail> {
  return requestJson<TraceNodeDetail>(
    `/api/traceability/nodes/${encodeURIComponent(traceNodeId)}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
