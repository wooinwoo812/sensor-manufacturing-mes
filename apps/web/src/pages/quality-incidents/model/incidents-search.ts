import {
  QUALITY_INCIDENT_SOURCE_TYPE_LABELS,
  QUALITY_INCIDENT_STATUS_LABELS,
  type QualityIncidentSourceType,
  type QualityIncidentStatus,
} from "@/entities/quality-incident";

export interface IncidentsSearch {
  q?: string;
  status?: readonly QualityIncidentStatus[];
  sourceType?: readonly QualityIncidentSourceType[];
  page?: number;
}

function parseList<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): readonly T[] | undefined {
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

export function readIncidentsSearch(raw: Record<string, unknown>): IncidentsSearch {
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
    status: parseList(
      raw.status,
      Object.keys(QUALITY_INCIDENT_STATUS_LABELS) as QualityIncidentStatus[],
    ),
    sourceType: parseList(
      raw.sourceType,
      Object.keys(
        QUALITY_INCIDENT_SOURCE_TYPE_LABELS,
      ) as QualityIncidentSourceType[],
    ),
    page,
  });
}

type IncidentsSearchPatch = {
  [K in keyof IncidentsSearch]?: IncidentsSearch[K] | undefined;
};

export function stripUndefinedSearch(value: IncidentsSearchPatch): IncidentsSearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as IncidentsSearch;
}

export function mergeIncidentsSearch(
  base: IncidentsSearch,
  patch: IncidentsSearchPatch,
): IncidentsSearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toIncidentsParams(search: IncidentsSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.status !== undefined && search.status.length > 0) {
    params.set("status", search.status.join(","));
  }
  if (search.sourceType !== undefined && search.sourceType.length > 0) {
    params.set("sourceType", search.sourceType.join(","));
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  return params;
}
