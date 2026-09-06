import { useState } from "react";

type ListQuery = { q?: string; page?: number; pageSize?: number };
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
  const [edit, setEdit] = useState({ key: appliedKey, value: applied });
  // Sync on back/forward, pagination and external links without an effect or input remount.
  if (edit.key !== appliedKey) setEdit({ key: appliedKey, value: applied });
  const draft = edit.key === appliedKey ? edit.value : applied;
  const setDraft = (value: Query) => setEdit({ key: appliedKey, value });
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
        (applied.pageSize === undefined
          ? {}
          : { pageSize: applied.pageSize }) as Query,
      ),
  };
}
