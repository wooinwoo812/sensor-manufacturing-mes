/** The focus stays on the real control; the spotlight shows its working context. */
export function tourRegion(target: HTMLElement): HTMLElement {
  return (
    target.closest<HTMLElement>('[data-tour-region], [data-tour="filters"]') ??
    target
  );
}
