import {
  MATERIAL_LOT_AVAILABILITY_OPTIONS,
  MATERIAL_LOT_DISPOSITIONS,
  type MaterialLotAvailability,
  type MaterialLotDisposition,
} from "@/entities/material-lot";

export interface MaterialLotsListSearch {
  q?: string;
  disposition?: readonly MaterialLotDisposition[];
  availability?: MaterialLotAvailability;
  page?: number;
}

function parseDispositionList(
  raw: unknown,
): readonly MaterialLotDisposition[] | undefined {
  if (typeof raw !== "string" || raw === "") {
    return undefined;
  }
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");
  const valid = values.filter((value): value is MaterialLotDisposition =>
    MATERIAL_LOT_DISPOSITIONS.includes(value as MaterialLotDisposition),
  );
  return valid.length > 0 ? valid : undefined;
}

export function readMaterialLotsSearch(
  raw: Record<string, unknown>,
): MaterialLotsListSearch {
  const availability =
    typeof raw.availability === "string" && raw.availability in MATERIAL_LOT_AVAILABILITY_OPTIONS
      ? (raw.availability as MaterialLotAvailability)
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

  return stripUndefinedSearch({
    q,
    disposition: parseDispositionList(raw.disposition),
    availability,
    page,
  });
}

type MaterialLotsSearchPatch = {
  [K in keyof MaterialLotsListSearch]?: MaterialLotsListSearch[K] | undefined;
};

export function stripUndefinedSearch(value: MaterialLotsSearchPatch): MaterialLotsListSearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as MaterialLotsListSearch;
}

export function mergeMaterialLotsSearch(
  base: MaterialLotsListSearch,
  patch: MaterialLotsSearchPatch,
): MaterialLotsListSearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toMaterialLotsSearchParams(
  search: MaterialLotsListSearch,
): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.disposition !== undefined && search.disposition.length > 0) {
    params.set("disposition", search.disposition.join(","));
  }
  if (search.availability !== undefined && search.availability !== "all") {
    params.set("availability", search.availability);
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  return params;
}
