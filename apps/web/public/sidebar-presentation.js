/* global window, document, sessionStorage, performance */
// Public, inert menu presentation only. Never used for authentication or authorization.
// Menu and role literals are checked against their code owners by sidebar-presentation.test.mjs.
(() => {
  const key = "mes:sidebar-presentation:v1";
  const groups = [
    {
      label: "생산 운영",
      items: [
        { label: "대시보드", to: "/dashboard", icon: "dashboard" },
        { label: "작업지시", icon: "work-order", to: "/work-orders" },
        { label: "공정 실행", icon: "execution", to: "/execution/queue" },
      ],
    },
    {
      label: "자재·품질",
      items: [
        { label: "BOM 기준정보", icon: "bom", to: "/materials/boms" },
        { label: "자재 LOT", icon: "material", to: "/materials/lots" },
        { label: "검사", icon: "inspection", to: "/quality/inspections" },
        { label: "부적합·격리", icon: "incident", to: "/quality/incidents" },
      ],
    },
    {
      label: "추적·관리",
      items: [
        { label: "LOT 계보", icon: "trace", to: "/traceability" },
        { label: "감사이력", icon: "audit", to: "/audit-events" },
        { label: "사용자", icon: "users", to: "/admin/users" },
      ],
    },
  ];
  const roles = {
    PRODUCTION_PLANNER: {
      label: "생산계획 담당자",
      paths: [
        "/dashboard",
        "/work-orders",
        "/execution/queue",
        "/materials/boms",
        "/materials/lots",
        "/quality/inspections",
        "/quality/incidents",
        "/traceability",
      ],
    },
    MATERIAL_MANAGER: {
      label: "자재 담당자",
      paths: [
        "/work-orders",
        "/materials/boms",
        "/materials/lots",
        "/quality/incidents",
        "/traceability",
      ],
    },
    SHOP_FLOOR_OPERATOR: {
      label: "현장 작업자",
      paths: ["/work-orders", "/execution/queue"],
    },
    QUALITY_ENGINEER: {
      label: "품질 담당자",
      paths: [
        "/work-orders",
        "/execution/queue",
        "/materials/boms",
        "/materials/lots",
        "/quality/inspections",
        "/quality/incidents",
        "/traceability",
      ],
    },
    SYSTEM_ADMIN: {
      label: "최고관리자",
      paths: [
        "/dashboard",
        "/work-orders",
        "/execution/queue",
        "/materials/boms",
        "/materials/lots",
        "/quality/inspections",
        "/quality/incidents",
        "/traceability",
        "/audit-events",
        "/admin/users",
      ],
    },
  };
  const icons = {
    audit:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw-clock" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>',
    bom: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-boxes" aria-hidden="true"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"></path><path d="m7 16.5-4.74-2.85"></path><path d="m7 16.5 5-3"></path><path d="M7 16.5v5.17"></path><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"></path><path d="m17 16.5-5-3"></path><path d="m17 16.5 4.74-2.85"></path><path d="M17 16.5v5.17"></path><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"></path><path d="M12 8 7.26 5.15"></path><path d="m12 8 4.74-2.85"></path><path d="M12 13.5V8"></path></svg>',
    dashboard:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>',
    execution:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-factory" aria-hidden="true"><path d="M12 16h.01"></path><path d="M16 16h.01"></path><path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path><path d="M8 16h.01"></path></svg>',
    incident:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>',
    inspection:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="m9 14 2 2 4-4"></path></svg>',
    material:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-search" aria-hidden="true"><path d="M12 22V12"></path><path d="M20.27 18.27 22 20"></path><path d="M21 10.498V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l.98-.559"></path><path d="M3.29 7 12 12l8.71-5"></path><path d="m7.5 4.27 8.997 5.148"></path><circle cx="18.5" cy="16.5" r="2.5"></circle></svg>',
    trace:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-git-branch" aria-hidden="true"><path d="M15 6a9 9 0 0 0-9 9V3"></path><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></svg>',
    users:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></svg>',
    "work-order":
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>',
    brand:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-factory" aria-hidden="true"><path d="M12 16h.01"></path><path d="M16 16h.01"></path><path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path><path d="M8 16h.01"></path></svg>',
    guide:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
    logout:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out" aria-hidden="true"><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path></svg>',
  };
  const publicPage = document.documentElement.dataset.bootLayout !== "shell";
  let role;
  const clear = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Storage can be unavailable; authentication never depends on it. */
    }
    role = undefined;
    for (const target of document.querySelectorAll(
      ".mes-boot .sidebar-preview",
    )) {
      target.querySelector(".preview-content")?.remove();
      target.querySelector(".preview-footer")?.remove();
    }
  };
  if (publicPage) clear();
  else if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
    try {
      const raw = sessionStorage.getItem(key);
      const hint = raw && raw.length < 256 ? JSON.parse(raw) : undefined;
      if (
        hint?.version === 1 &&
        Object.hasOwn(roles, hint.role) &&
        Number.isFinite(hint.expiresAt) &&
        hint.expiresAt > Date.now() &&
        hint.expiresAt <= Date.now() + 30 * 60 * 1000
      )
        role = hint.role;
      else clear();
    } catch {
      clear();
    }
  }
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const icon = (name) => {
    const node = element("span", "preview-icon");
    // These SVG strings are trusted, code-owned Lucide assets, never storage or API input.
    node.innerHTML = icons[name];
    return node;
  };
  const item = (entry, pathname) => {
    const node = element("div", "preview-item");
    node.dataset.previewPath = entry.to;
    const active =
      pathname === entry.to ||
      pathname.startsWith(entry.to + "/") ||
      (entry.to === "/execution/queue" &&
        pathname.startsWith("/execution/lots/"));
    if (active) node.dataset.active = "true";
    node.append(
      icon(entry.icon),
      element("span", "preview-label", entry.label),
    );
    return node;
  };
  const paint = (target) => {
    if (!target || ["/", "/login"].includes(window.location.pathname)) return;
    target.classList.add("sidebar-preview");
    target.setAttribute("inert", "");
    target.setAttribute("aria-hidden", "true");
    const brand = element("div", "preview-brand"),
      mark = element("div", "preview-mark");
    mark.append(icon("brand"));
    const brandText = element("div", "preview-brand-text");
    brandText.append(
      element("strong", "", "FabriScope MES"),
      element("span", "", "센서 제조 운영"),
    );
    brand.append(mark, brandText);
    const children = [brand];
    if (role) {
      const menu = roles[role],
        content = element("div", "preview-content"),
        nav = element("div", "preview-navigation"),
        pathname = window.location.pathname;
      for (const group of groups) {
        const items = group.items.filter((entry) =>
          menu.paths.includes(entry.to),
        );
        if (!items.length) continue;
        const section = element("div", "preview-group"),
          list = element("div", "preview-items");
        section.append(element("div", "preview-group-label", group.label));
        for (const entry of items) list.append(item(entry, pathname));
        section.append(list);
        nav.append(section);
      }
      const support = element("div", "preview-support");
      support.append(
        item({ to: "/guide", label: "업무 가이드", icon: "guide" }, pathname),
      );
      content.append(nav, support);
      const footer = element("div", "preview-footer"),
        switcher = element("div", "preview-item preview-switch");
      switcher.append(
        icon("logout"),
        element("span", "preview-role", menu.label),
        element("span", "preview-label", "역할 전환"),
      );
      footer.append(switcher);
      children.push(content, footer);
    }
    target.replaceChildren(...children);
  };
  window.__MES_SIDEBAR_PREVIEW__ = {
    paint,
    clear,
    remember(code) {
      if (!Object.hasOwn(roles, code)) return;
      role = code;
      document.documentElement.dataset.bootLayout = "shell";
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            role: code,
            expiresAt: Date.now() + 30 * 60 * 1000,
          }),
        );
      } catch {
        /* Storage can be unavailable; authentication never depends on it. */
      }
    },
  };
  for (const target of document.querySelectorAll(".mes-boot .boot-sidebar"))
    paint(target);
})();
