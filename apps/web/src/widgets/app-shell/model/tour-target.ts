export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/** Wait for the real, visible target after route/data rendering. No business action is invoked. */
export function waitForTourTarget(
  anchor: string,
  signal: AbortSignal,
  timeout = 6000,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const observer = new MutationObserver(check);
    function finish(target: HTMLElement | null) {
      clearTimeout(timer);
      observer.disconnect();
      signal.removeEventListener("abort", abort);
      resolve(target);
    }
    function abort() {
      finish(null);
    }
    function check() {
      const container =
        document.querySelector<HTMLElement>(
          '[data-tour="' + anchor + '"][data-tour-preferred="true"]',
        ) ??
        document.querySelector<HTMLElement>('[data-tour="' + anchor + '"]');
      const target =
        anchor === "page-actions"
          ? (container?.querySelector<HTMLElement>(
              "button:not(:disabled), a[href]",
            ) ?? container)
          : anchor === "filters"
            ? (container?.querySelector<HTMLElement>('[role="combobox"]') ??
              container)
            : container;
      if (
        target &&
        !target.matches(":disabled") &&
        target.getBoundingClientRect().width > 0 &&
        // Skeletons share table anchors but are replaced when data arrives.
        // Keep observing until the real content can retain focus and its spotlight.
        !target.closest(
          '[hidden], [aria-hidden="true"], [data-loading-placeholder="true"]',
        )
      )
        finish(target);
    }
    if (signal.aborted) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => finish(null), timeout);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    signal.addEventListener("abort", abort, { once: true });
    check();
  });
}

export function positionTourCard(
  rect: TourRect | null,
  viewportWidth: number,
  viewportHeight: number,
  cardWidth: number,
  cardHeight: number,
) {
  const margin = 16,
    gap = 16;
  const clampX = (x: number) =>
    Math.max(margin, Math.min(x, viewportWidth - cardWidth - margin));
  const clampY = (y: number) =>
    Math.max(margin, Math.min(y, viewportHeight - cardHeight - margin));
  if (viewportWidth < 768)
    return { left: margin, top: clampY(viewportHeight - cardHeight - margin) };
  if (!rect)
    return {
      left: clampX(viewportWidth - cardWidth - margin),
      top: clampY(viewportHeight - cardHeight - margin),
    };
  if (rect.right + gap + cardWidth <= viewportWidth - margin)
    return { left: clampX(rect.right + gap), top: clampY(rect.top) };
  if (rect.left - gap - cardWidth >= margin)
    return { left: clampX(rect.left - gap - cardWidth), top: clampY(rect.top) };
  const centeredX = clampX(rect.left + (rect.width - cardWidth) / 2);
  if (rect.bottom + gap + cardHeight <= viewportHeight - margin)
    return { left: centeredX, top: clampY(rect.bottom + gap) };
  if (rect.top - gap - cardHeight >= margin)
    return { left: centeredX, top: clampY(rect.top - gap - cardHeight) };
  return {
    left: centeredX,
    top: clampY(viewportHeight - cardHeight - margin),
  };
}
