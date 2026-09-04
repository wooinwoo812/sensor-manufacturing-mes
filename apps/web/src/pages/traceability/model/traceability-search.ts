import {
  TRACE_NODE_TYPES,
  type TraceNodeType,
} from "@/entities/trace-node";

export interface TraceabilitySearch {
  q?: string;
  nodeType?: readonly TraceNodeType[];
  page?: number;
}

export type TraceabilitySearchPatch = {
  [K in keyof TraceabilitySearch]?: TraceabilitySearch[K] | undefined;
};

function parseNodeTypeList(
  raw: unknown,
  allowed: readonly TraceNodeType[],
): readonly TraceNodeType[] | undefined {
  if (typeof raw !== "string" || raw === "") {
    return undefined;
  }
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  const valid = values.filter(
    (value): value is TraceNodeType => allowed.includes(value as TraceNodeType),
  );
  return valid.length > 0 ? valid : undefined;
}

export function stripUndefinedSearch(
  value: TraceabilitySearchPatch,
): TraceabilitySearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as TraceabilitySearch;
}

export function readTraceabilitySearch(
  raw: Record<string, unknown>,
): TraceabilitySearch {
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

  return stripUndefinedSearch({
    q,
    nodeType: parseNodeTypeList(raw.nodeType, TRACE_NODE_TYPES),
    page,
  });
}

export function mergeTraceabilitySearch(
  base: TraceabilitySearch,
  patch: TraceabilitySearchPatch,
): TraceabilitySearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toTraceabilityParams(
  search: TraceabilitySearch,
): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.nodeType !== undefined && search.nodeType.length > 0) {
    params.set("nodeType", search.nodeType.join(","));
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  return params;
}
