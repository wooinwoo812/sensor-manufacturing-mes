import { tourRegion } from "./tour-region";
import { TOUR_CARD_HEIGHT } from "./tour-layout";
import { tourCardWidth } from "./tour-target";

export const TOUR_SCROLL_DURATION = 320;

/** Scroll once before showing the new spotlight. Aborting never finishes a stale step. */
export function scrollToTourTarget(
  target: HTMLElement,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted || !target.isConnected) return Promise.resolve();
  const region = tourRegion(target);
  const regionRect = region.getBoundingClientRect();
  const focusRect = target.getBoundingClientRect();
  const cardRect = document.querySelector<HTMLElement>("[data-tour-card]")?.getBoundingClientRect();
  const cardHeight = cardRect?.height || TOUR_CARD_HEIGHT;
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const cardWidth = tourCardWidth({ left: regionRect.left - 6, right: regionRect.right + 6 }, viewportWidth);
  const fitsBesideRegion =
    regionRect.left - 6 >= cardWidth + 32 ||
    viewportWidth - regionRect.right - 6 >= cardWidth + 32;
  const availableHeight = Math.max(
    120,
    window.innerHeight - (fitsBesideRegion ? 0 : cardHeight) - 120,
  );
  // Show the whole section when it fits; keep a specific input visible in a long section.
  const rect =
    region !== target && focusRect.bottom - regionRect.top > availableHeight
      ? focusRect
      : regionRect;
  const start = window.scrollY;
  const viewportBottom =
    !fitsBesideRegion
      ? window.innerHeight - cardHeight - 32
      : window.innerHeight - 16;
  const desired =
    window.innerWidth < 768 || rect.height > availableHeight
      ? start + rect.top - 88
      : rect.top < 80 || rect.bottom > viewportBottom
        ? start +
          rect.top -
          Math.max(80, (viewportBottom + 80 - rect.height) / 2)
        : start;
  const end = Math.max(
    0,
    Math.min(
      desired,
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    ),
  );
  const horizontal: { element: HTMLElement; start: number; end: number }[] = [];
  for (
    let parent = target.parentElement;
    parent && parent !== document.body;
    parent = parent.parentElement
  ) {
    if (
      !/(auto|scroll)/.test(getComputedStyle(parent).overflowX) ||
      parent.scrollWidth <= parent.clientWidth
    )
      continue;
    const bounds = parent.getBoundingClientRect();
    if (
      focusRect.left >= bounds.left + 8 &&
      focusRect.right <= bounds.right - 8
    )
      continue;
    const left = parent.scrollLeft;
    const next = Math.max(
      0,
      Math.min(
        parent.scrollWidth - parent.clientWidth,
        left +
          focusRect.left -
          bounds.left -
          (parent.clientWidth - focusRect.width) / 2,
      ),
    );
    if (Math.abs(next - left) >= 1)
      horizontal.push({ element: parent, start: left, end: next });
  }
  const applyScroll = (progress: number) => {
    if (Math.abs(end - start) >= 1)
      window.scrollTo({
        top: start + (end - start) * progress,
        behavior: "instant",
      });
    for (const item of horizontal)
      item.element.scrollTo({
        left: item.start + (item.end - item.start) * progress,
        behavior: "instant",
      });
  };
  if (Math.abs(end - start) < 1 && horizontal.length === 0)
    return Promise.resolve();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyScroll(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const started = performance.now();
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const tick = (now: number) => {
      if (signal.aborted || !target.isConnected) {
        finish();
        return;
      }
      const progress = Math.min(
        1,
        Math.max(0, (now - started) / TOUR_SCROLL_DURATION),
      );
      // Ease out: settle gently, without overshoot or a second corrective scroll.
      const eased = 1 - Math.pow(1 - progress, 3);
      applyScroll(eased);
      if (progress === 1) finish();
      else frame = requestAnimationFrame(tick);
    };
    signal.addEventListener("abort", finish, { once: true });
    frame = requestAnimationFrame(tick);
  });
}
