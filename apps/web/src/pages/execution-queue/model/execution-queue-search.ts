import { PROCESS_READINESS_FILTER_OPTIONS, type ProcessReadinessFilterOption } from "@/entities/process-execution";

export interface ExecutionQueueSearch {
  q?: string;
  readiness?: ProcessReadinessFilterOption;
  page?: number;
}

export function readExecutionQueueSearch(
  raw: Record<string, unknown>,
): ExecutionQueueSearch {
  const readiness =
    typeof raw.readiness === "string" && raw.readiness in PROCESS_READINESS_FILTER_OPTIONS
      ? (raw.readiness as ProcessReadinessFilterOption)
      : undefined;

  let page: number | undefined;
  if (
    typeof raw.page === "string" &&
    Number.isInteger(Number(raw.page)) &&
    Number(raw.page) > 0
  ) {
    page = Number(raw.page);
  }

  const q =
    typeof raw.q === "string" && raw.q.trim() !== "" ? raw.q.trim() : undefined;

  return stripUndefinedSearch({ q, readiness, page });
}

type ExecutionQueueSearchPatch = {
  [K in keyof ExecutionQueueSearch]?: ExecutionQueueSearch[K] | undefined;
};

export function stripUndefinedSearch(value: ExecutionQueueSearchPatch): ExecutionQueueSearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as ExecutionQueueSearch;
}

export function mergeExecutionQueueSearch(
  base: ExecutionQueueSearch,
  patch: ExecutionQueueSearchPatch,
): ExecutionQueueSearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toExecutionQueueParams(search: ExecutionQueueSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.readiness !== undefined && search.readiness !== "all") {
    params.set("readiness", search.readiness);
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  return params;
}
