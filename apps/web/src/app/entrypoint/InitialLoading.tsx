import { useLayoutEffect, useRef } from "react";
import { paintSidebarPresentation } from "@/shared/lib";

export function InitialLoading() {
  const sidebar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => paintSidebarPresentation(sidebar.current), []);
  const title = document.documentElement.dataset.bootPageTitle ?? "";
  return (
    <div className="mes-boot" aria-busy="true" data-initial-loading>
      <div ref={sidebar} className="boot-sidebar" aria-hidden="true" inert>
        <div className="boot-brand">FabriScope MES</div>
      </div>
      <div className="boot-workspace">
        <div className="boot-header" aria-hidden="true">
          <span data-boot-page-title>{title}</span>
        </div>
        <main id="main-content" className="boot-main">
          {title ? <h1 data-boot-page-title>{title}</h1> : null}
          <p className="boot-status" role="status">
            화면을 여는 중입니다.
          </p>
        </main>
      </div>
    </div>
  );
}
