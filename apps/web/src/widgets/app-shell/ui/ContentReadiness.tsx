import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Readiness only gates the automatic invite; it never hides or replaces content. */
export function ContentReadiness({
  onReady,
  children,
}: {
  onReady: () => void;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ready || !frame.current) return;
    let active = true;
    const check = () => {
      const node = frame.current;
      if (
        !active ||
        !node?.querySelector("main") ||
        node.querySelector("[data-loading-placeholder], [data-initial-loading]")
      )
        return;
      active = false;
      window.__MES_DATA_LAYOUT__ = null;
      setReady(true);
      onReady();
    };
    const observer = new MutationObserver(check);
    observer.observe(frame.current, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    queueMicrotask(check);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [onReady, ready]);
  return (
    <div ref={frame} data-startup-ready={ready} className="contents">
      {children}
    </div>
  );
}
