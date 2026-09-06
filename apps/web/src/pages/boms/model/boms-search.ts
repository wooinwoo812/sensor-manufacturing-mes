import { getPageSize, readPageSize } from "@/shared/lib";
import { BOM_LIFECYCLES, type BomLifecycle } from "@/entities/bom";

export interface BomsSearch {
  q?: string;
  lifecycle?: readonly BomLifecycle[];
  page?: number;
  pageSize?: number;
}

export type BomsSearchPatch = {
  [K in keyof BomsSearch]?: BomsSearch[K] | undefined;
};

function parseLifecycleList(
  raw: unknown,
  allowed: readonly BomLifecycle[],
): readonly BomLifecycle[] | undefined {
  if (typeof raw !== "string" || raw === "") {
    return undefined;
  }
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  const valid = values.filter((value): value is BomLifecycle =>
    allowed.includes(value as BomLifecycle),
  );
  return valid.length > 0 ? valid : undefined;
}

export function stripUndefinedSearch(value: BomsSearchPatch): BomsSearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as BomsSearch;
}

export function readBomsSearch(raw: Record<string, unknown>): BomsSearch {
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
    lifecycle: parseLifecycleList(raw.lifecycle, BOM_LIFECYCLES),
    page,
    pageSize: readPageSize(raw.pageSize),
  });
}

export function mergeBomsSearch(
  base: BomsSearch,
  patch: BomsSearchPatch,
): BomsSearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toBomsParams(search: BomsSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.lifecycle !== undefined && search.lifecycle.length > 0) {
    params.set("lifecycle", search.lifecycle.join(","));
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  params.set("pageSize", String(getPageSize(search.pageSize)));
  return params;
}
