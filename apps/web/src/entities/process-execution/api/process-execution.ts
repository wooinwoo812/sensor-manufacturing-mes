import { requestJson } from "@/shared/api";
import type { ProcessExecutionDetail } from "../model/process-execution";
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

export async function fetchProcessExecutionDetail(
  stepId: string,
  signal?: AbortSignal,
): Promise<ProcessExecutionDetail> {
  return requestJson<ProcessExecutionDetail>(
    `/api/process-executions/steps/${encodeURIComponent(stepId)}`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}
