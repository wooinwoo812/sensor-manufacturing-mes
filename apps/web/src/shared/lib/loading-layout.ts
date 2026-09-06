import { getCookie } from "./shadcn/cookies";

export interface DataLayoutSnapshot {
  version: 2;
  href: string;
  width: number;
  viewportHeight: number;
  sidebar: "expanded" | "collapsed";
  height: number;
  scrollY: number;
  regions: { name: string; height: number }[];
}
declare global {
  interface Window {
    __MES_DATA_LAYOUT__?: DataLayoutSnapshot | null;
  }
}

/** A stale route/viewport/sidebar must never impose another screen's height. */
export function loadingRegionHeight(name: string): number | undefined {
  const layout = window.__MES_DATA_LAYOUT__;
  if (
    !layout ||
    layout.href !== location.pathname + location.search ||
    layout.width !== window.innerWidth ||
    layout.viewportHeight !== window.innerHeight ||
    (window.innerWidth >= 1024 &&
      layout.sidebar !==
        (getCookie("sidebar_state") === "false" ? "collapsed" : "expanded"))
  )
    return;
  return layout.regions.find((region) => region.name === name)?.height;
}
