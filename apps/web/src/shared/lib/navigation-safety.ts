import { useEffect, useId } from "react";

const entries = new Map<string, { dirty: boolean; pending: boolean }>();

/** Registers local editor state for an explicitly requested guided navigation. */
export function useNavigationSafety(dirty: boolean, pending = false) {
  const id = useId();
  useEffect(() => {
    entries.set(id, { dirty, pending });
    return () => {
      entries.delete(id);
    };
  }, [id, dirty, pending]);
}

export function readNavigationSafety() {
  return {
    dirty: [...entries.values()].some((entry) => entry.dirty),
    pending: [...entries.values()].some((entry) => entry.pending),
  };
}
