export type SortOrder = "asc" | "desc";

export interface ListSort {
  sort?: string;
  order?: SortOrder;
}

/** URL 입력은 화면별 API 허용 목록을 통과한 정렬만 사용한다. */
export function readListSort(
  raw: Record<string, unknown>,
  fields: readonly string[],
): ListSort {
  if (typeof raw.sort !== "string" || !fields.includes(raw.sort)) return {};
  return { sort: raw.sort, order: raw.order === "desc" ? "desc" : "asc" };
}

export function appendListSort(params: URLSearchParams, search: ListSort) {
  if (search.sort) {
    params.set("sort", search.sort);
    params.set("order", search.order ?? "asc");
  }
}
