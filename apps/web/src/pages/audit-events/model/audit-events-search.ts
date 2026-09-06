import { readListSort, appendListSort, type ListSort } from "@/shared/lib";
import { getPageSize, readPageSize } from "@/shared/lib";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTOR_ROLE_OPTIONS,
  type AuditAction,
  type AuditActorRole,
} from "@/entities/audit-event";

export interface AuditEventsSearch extends ListSort {
  q?: string;
  actorRole?: readonly AuditActorRole[];
  action?: readonly AuditAction[];
  page?: number;
  pageSize?: number;
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
  const valid = values.filter((value): value is T =>
    allowed.includes(value as T),
  );
  return valid.length > 0 ? valid : undefined;
}

export function readAuditEventsSearch(
  raw: Record<string, unknown>,
): AuditEventsSearch {
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
    ...readListSort(raw, ["occurredAt", "entityId"]),
    q,
    actorRole: parseList(
      raw.actorRole,
      Object.keys(AUDIT_ACTOR_ROLE_OPTIONS) as AuditActorRole[],
    ),
    action: parseList(
      raw.action,
      Object.keys(AUDIT_ACTION_LABELS) as AuditAction[],
    ),
    page,
    pageSize: readPageSize(raw.pageSize),
  });
}

type AuditEventsSearchPatch = {
  [K in keyof AuditEventsSearch]?: AuditEventsSearch[K] | undefined;
};

export function stripUndefinedSearch(
  value: AuditEventsSearchPatch,
): AuditEventsSearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as AuditEventsSearch;
}

export function mergeAuditEventsSearch(
  base: AuditEventsSearch,
  patch: AuditEventsSearchPatch,
): AuditEventsSearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toAuditEventsParams(
  search: AuditEventsSearch,
): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.actorRole !== undefined && search.actorRole.length > 0) {
    params.set("actorRole", search.actorRole.join(","));
  }
  if (search.action !== undefined && search.action.length > 0) {
    params.set("action", search.action.join(","));
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  params.set("pageSize", String(getPageSize(search.pageSize)));
  appendListSort(params, search);
  return params;
}
