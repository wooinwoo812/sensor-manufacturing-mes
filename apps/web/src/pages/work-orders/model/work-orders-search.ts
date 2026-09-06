import { getPageSize, readPageSize } from "@/shared/lib";
import {
  WORK_ORDER_DUE_OPTIONS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderDueFilter,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/entities/work-order";

export interface WorkOrdersListSearch {
  q?: string;
  status?: readonly WorkOrderStatus[];
  priority?: readonly WorkOrderPriority[];
  due?: WorkOrderDueFilter;
  blocked?: boolean;
  page?: number;
  pageSize?: number;
}

function parseEnumList<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): readonly T[] | undefined {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }
  if (typeof raw !== "string") {
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

export function readWorkOrdersSearch(
  raw: Record<string, unknown>,
): WorkOrdersListSearch {
  const due =
    typeof raw.due === "string" && raw.due in WORK_ORDER_DUE_OPTIONS
      ? (raw.due as WorkOrderDueFilter)
      : undefined;

  let blocked: boolean | undefined;
  if (raw.blocked === "true") {
    blocked = true;
  } else if (raw.blocked === "false") {
    blocked = false;
  }

  const page =
    typeof raw.page === "string" &&
    Number.isInteger(Number(raw.page)) &&
    Number(raw.page) > 0
      ? Number(raw.page)
      : undefined;

  const q =
    typeof raw.q === "string" && raw.q.trim() !== "" ? raw.q.trim() : undefined;
  const status = parseEnumList(raw.status, WORK_ORDER_STATUSES);
  const priority = parseEnumList(raw.priority, WORK_ORDER_PRIORITIES);

  return stripUndefinedSearch({
    q,
    status,
    priority,
    due,
    blocked,
    page,
    pageSize: readPageSize(raw.pageSize),
  });
}

type WorkOrdersSearchPatch = {
  [K in keyof WorkOrdersListSearch]?: WorkOrdersListSearch[K] | undefined;
};

export function stripUndefinedSearch(
  value: WorkOrdersSearchPatch,
): WorkOrdersListSearch {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key] = entry;
    }
  }
  return result as WorkOrdersListSearch;
}

export function mergeWorkOrdersSearch(
  base: WorkOrdersListSearch,
  patch: WorkOrdersSearchPatch,
): WorkOrdersListSearch {
  return stripUndefinedSearch({ ...base, ...patch });
}

export function toWorkOrdersSearchParams(
  search: WorkOrdersListSearch,
): URLSearchParams {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set("q", search.q);
  }
  if (search.status !== undefined && search.status.length > 0) {
    params.set("status", search.status.join(","));
  }
  if (search.priority !== undefined && search.priority.length > 0) {
    params.set("priority", search.priority.join(","));
  }
  if (search.due !== undefined && search.due !== "all") {
    params.set("due", search.due);
  }
  if (search.blocked !== undefined) {
    params.set("blocked", String(search.blocked));
  }
  if (search.page !== undefined && search.page > 1) {
    params.set("page", String(search.page));
  }
  params.set("pageSize", String(getPageSize(search.pageSize)));
  return params;
}
