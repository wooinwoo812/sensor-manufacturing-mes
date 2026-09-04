import { requestJson } from "@/shared/api";
import type { ProcessExecutionListResult } from "../model/process-execution";

export async function fetchProcessExecutions(
  searchParams: URLSearchParams,
  signal?: AbortSignal,
): Promise<ProcessExecutionListResult> {
  const query = searchParams.toString();
  return requestJson<ProcessExecutionListResult>(
    `/api/process-executions${query === "" ? "" : `?${query}`}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
