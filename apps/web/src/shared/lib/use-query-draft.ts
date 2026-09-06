import { useState } from "react";

type ListQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
};
const displayKeys = new Set(["page", "pageSize", "sort", "order"]);
const signature = (query: object) =>
  JSON.stringify(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

/** Keep edited conditions separate from the applied URL until an explicit query. */
export function useQueryDraft<Query extends ListQuery>(
  applied: Query,
  onApply: (query: Query) => void,
  reload: () => void,
) {
  const appliedKey = signature(applied);
  const filterKey = signature(
    Object.fromEntries(
      Object.entries(applied).filter(([key]) => !displayKeys.has(key)),
    ),
  );
  const [edit, setEdit] = useState({
    key: appliedKey,
    filterKey,
    value: applied,
  });
  // Sync on back/forward, pagination and external links without an effect or input remount.
  const nextDraft =
    edit.filterKey === filterKey
      ? ({
          ...Object.fromEntries(
            Object.entries(edit.value).filter(([key]) => !displayKeys.has(key)),
          ),
          ...Object.fromEntries(
            Object.entries(applied).filter(([key]) => displayKeys.has(key)),
          ),
        } as Query)
      : applied;
  if (edit.key !== appliedKey)
    setEdit({ key: appliedKey, filterKey, value: nextDraft });
  const draft = edit.key === appliedKey ? edit.value : nextDraft;
  const setDraft = (value: Query) =>
    setEdit({ key: appliedKey, filterKey, value });
  const normalize = (value: Query): Query => {
    const next = { ...value };
    delete next.page;
    const q = value.q?.trim();
    if (q) next.q = q;
    else delete next.q;
    for (const key of Object.keys(next) as (keyof Query)[]) {
      if (next[key] === undefined) delete next[key];
    }
    return next;
  };
  const commit = (next: Query) => {
    setDraft(next);
    if (signature(next) === appliedKey) reload();
    else onApply(next);
  };
  return {
    draft,
    setDraft,
    hasPendingChanges:
      signature(normalize(draft)) !== signature(normalize(applied)),
    submit: () => commit(normalize(draft)),
    reset: () =>
      commit(
        Object.fromEntries(
          Object.entries(applied).filter(
            ([key, value]) =>
              key !== "page" && displayKeys.has(key) && value !== undefined,
          ),
        ) as Query,
      ),
  };
}
