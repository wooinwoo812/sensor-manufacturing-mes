/** The focus stays on the real control; the spotlight shows its working context. */
export function tourRegion(target: HTMLElement): HTMLElement {
  // Column-specific steps must move the spotlight with the column.
  if (target.matches("th")) return target;
  return (
    target.closest<HTMLElement>('[data-tour-region], [data-tour="filters"]') ??
    target
  );
}
