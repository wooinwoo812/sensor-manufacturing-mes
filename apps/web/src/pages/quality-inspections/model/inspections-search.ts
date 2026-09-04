import {
  INSPECTION_EXECUTION_STATUS_LABELS,
  INSPECTION_GATE_LABELS,
  INSPECTION_VERDICT_LABELS,
  type InspectionExecutionStatus,
  type InspectionGate,
  type InspectionVerdict,
} from "@/entities/inspection";

export interface InspectionsSearch {
  q?: string;
  executionStatus?: readonly InspectionExecutionStatus[];
  verdict?: readonly InspectionVerdict[];
  gate?: readonly InspectionGate[];
  page?: number;
}

function parseList<T extends string>(raw: unknown, allowed: readonly T[]): readonly T[] | undefined {
  if (typeof raw !== "string" || raw === "") {
    return undefined;
  }
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  const valid = values.filter((value): value is T => allowed.includes(value as T));
  return valid.length > 0 ? valid : undefined;
}

export function readInspectionsSearch(raw: Record<string, unknown>): InspectionsSearch {
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
    executionStatus: parseList(raw.executionStatus, Object.keys(INSPECTION_EXECUTION_STATUS_LABELS) as InspectionExecutionStatus[]),
    verdict: parseList(raw.verdict, Object.keys(INSPECTION_VERDICT_LABELS) as InspectionVerdict[]),
    gate: parseList(raw.gate, Object.keys(INSPECTION_GATE_LABELS) as InspectionGate[]),
    page,
  });
}

type InspectionsSearchPatch = {
  [K in keyof InspectionsSearch]?: InspectionsSearch[K] | undefined;
};

export function stripUndefinedSearch(value: InspectionsSearchPatch): InspectionsSearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as InspectionsSearch;
}

export function mergeInspectionsSearch(
  base: InspectionsSearch,
  patch: InspectionsSearchPatch,
): InspectionsSearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toInspectionsParams(search: InspectionsSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.executionStatus !== undefined && search.executionStatus.length > 0) {
    params.set("executionStatus", search.executionStatus.join(","));
  }
  if (search.verdict !== undefined && search.verdict.length > 0) {
    params.set("verdict", search.verdict.join(","));
  }
  if (search.gate !== undefined && search.gate.length > 0) {
    params.set("gate", search.gate.join(","));
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  return params;
}
