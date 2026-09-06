export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Only supported sizes can enter URL or API state; malformed values fall back to ten. */
export function getPageSize(raw: unknown): number {
  if (typeof raw !== "string" && typeof raw !== "number")
    return DEFAULT_PAGE_SIZE;
  const value = Number(raw);
  return PAGE_SIZE_OPTIONS.some((size) => size === value)
    ? value
    : DEFAULT_PAGE_SIZE;
}

/** Keep the default out of the route URL, but always send it explicitly to the API. */
export function readPageSize(raw: unknown): number | undefined {
  const value = getPageSize(raw);
  return value === DEFAULT_PAGE_SIZE ? undefined : value;
}
