/* global window, document, location, sessionStorage, innerWidth, innerHeight, scrollY, performance, requestAnimationFrame, addEventListener */
// Reserve only explicitly marked API-result regions. Never copy UI text, HTML or business records.
(() => {
  const key = "mes:data-region-layout:v2";
  const href = () => location.pathname + location.search;
  const finite = (n) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 200000;
  const valid = (s) =>
    s &&
    s.version === 2 &&
    s.href === href() &&
    s.width === innerWidth &&
    s.viewportHeight === innerHeight &&
    s.sidebar === document.documentElement.dataset.bootSidebar &&
    finite(s.height) &&
    finite(s.scrollY) &&
    s.scrollY <= s.height &&
    Array.isArray(s.regions) &&
    s.regions.length > 0 &&
    s.regions.length <= 40 &&
    s.regions.every(
      (r) =>
        r &&
        typeof r.name === "string" &&
        /^[a-z0-9-]{1,64}$/.test(r.name) &&
        finite(r.height) &&
        r.height > 0,
    );
  let layout = null;
  try {
    const candidate = JSON.parse(sessionStorage.getItem(key) || "null");
    if (
      performance.getEntriesByType("navigation")[0]?.type === "reload" &&
      valid(candidate)
    )
      layout = candidate;
  } catch {
    /* Optional geometry cannot prevent the app from opening. */
  }
  window.__MES_DATA_LAYOUT__ = layout;
  if (layout) {
    document.documentElement.style.setProperty(
      "--boot-document-height",
      layout.height + "px",
    );
    requestAnimationFrame(() =>
      window.scrollTo({ top: layout.scrollY, behavior: "instant" }),
    );
  }
  addEventListener("pagehide", () => {
    if (
      location.pathname === "/login" ||
      !document.querySelector('[data-startup-ready="true"]') ||
      document.querySelector("[data-guided-tour], [data-loading-placeholder]")
    )
      return;
    const candidates = Array.from(
      document.querySelectorAll("[data-loading-region]"),
    );
    const topLevel = candidates.filter(
      (el) =>
        !candidates.some((parent) => parent !== el && parent.contains(el)),
    );
    const regions = topLevel
      .slice(0, 40)
      .map((el) => ({
        name: el.getAttribute("data-loading-region"),
        height: el.getBoundingClientRect().height,
      }))
      .filter(
        (region) => region.name && finite(region.height) && region.height > 0,
      );
    if (!regions.length) return;
    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    const sidebar =
      innerWidth < 1024
        ? document.documentElement.dataset.bootSidebar
        : inset && inset.getBoundingClientRect().x < 100
          ? "collapsed"
          : "expanded";
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          href: href(),
          width: innerWidth,
          viewportHeight: innerHeight,
          sidebar,
          height: document.documentElement.scrollHeight,
          scrollY,
          regions,
        }),
      );
    } catch {
      /* No API responses are cached. */
    }
  });
})();
